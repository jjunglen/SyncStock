const { Op } = require("sequelize");
const {
  PendingNotification,
  NotificationLog,
  Inventory,
  Alert,
  Store,
  User,
  Account,
} = require("../models/index.js");
const { sendDigestEmail } = require("./email.service.js");
const { sendDigestText } = require("./sms.service.js");
const { sendPushNotification } = require("./push.service.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");

// A shopper's digest waits until their batch has settled: nothing new
// queued for them, and none of the queued products edited in Shopify,
// for QUIET_MS. Listing tools (e.g. Copyt) create a product and then add
// or reorder photos over several webhooks, and list a drop over several
// minutes — waiting lets the whole drop land in one email with final
// photos. MAX_WAIT_MS caps the wait on a busy listing day.
const QUIET_MS = 3 * 60 * 1000;
const MAX_WAIT_MS = 10 * 60 * 1000;

const maybeSendText = async ({ store, account, user, items }) => {
  if (store.sms_enabled && account.phone_verified && user.notify_sms) {
    await sendDigestText({
      phoneNumber: account.phone_number,
      store,
      items,
    }).catch((err) => console.error("Send digest text error:", err.message));
  }
};

const setSent = (items, sent) =>
  PendingNotification.update(
    { sent },
    { where: { id: { [Op.in]: items.map((p) => p.id) } } },
  );

const requeue = (items, userId, err) => {
  console.error(`Digest send failed for user ${userId}:`, err.message);
  return setSent(items, false).catch((resetErr) =>
    console.error("Digest requeue error:", resetErr.message),
  );
};

const isPriceDrop = (item) =>
  item.compare_at_price && item.price &&
  parseFloat(item.price) < parseFloat(item.compare_at_price);

const inAppMessage = (item) => {
  const name = item.size ? `${item.product_name} (Size ${item.size})` : item.product_name;
  return isPriceDrop(item) ? `${name} dropped to $${item.price}` : `${name} is back in stock`;
};

// One push per batch, not one per shoe
const pushPayload = (store, items) => {
  if (items.length === 1) {
    const [item] = items;
    return {
      title: isPriceDrop(item) ? "Price drop" : item.alert_id ? "Your alert just hit" : "New in your size",
      body: inAppMessage(item),
      icon: item.image_url || "/favicon.svg",
      url: item.shopify_url,
    };
  }
  const names = items.slice(0, 2).map((i) => i.product_name).join(", ");
  const more = items.length > 2 ? ` and ${items.length - 2} more` : "";
  return {
    title: `${items.length} new matches at ${store.name}`,
    body: `${names}${more}`,
    icon: items[0].image_url || "/favicon.svg",
    url: `${storeBaseUrl(store)}/store/dashboard`,
  };
};

// In-app inbox entries plus the push. Runs after the email; a failure
// here is logged, not requeued, so the email isn't sent twice.
const deliverInApp = async (store, userId, items) => {
  try {
    await NotificationLog.bulkCreate(
      items.map((item) => ({
        store_id: store.id,
        user_id: userId,
        alert_id: item.alert_id,
        inventory_id: item.inventory_id,
        channel: "in_app",
        image_url: item.image_url || null,
        message: inAppMessage(item),
      })),
    );
    await sendPushNotification(store.id, userId, pushPayload(store, items));
  } catch (err) {
    console.error(`In-app/push delivery failed for user ${userId}:`, err.message);
  }
};

// Sends one user's batch (items are already marked sent, so a concurrent
// flush can't pick them up too). Channel settings are read now, not when
// queued, so turning a channel off or deleting an alert while the batch
// waits is respected. One email covers saved-alert and size-alert
// matches (no alert_id); if it fails, the batch is requeued.
const deliverDigest = async (storeId, userId, items) => {
  let store, user, account, wants;
  let emailItems = [];
  try {
    store = await Store.findByPk(storeId);
    user = await User.findByPk(userId);
    if (!store || !user) return;
    account = await Account.findByPk(user.account_id);
    if (!account) return;

    const alertIds = [...new Set(items.map((i) => i.alert_id).filter(Boolean))];
    const alerts = await Alert.findAll({
      where: { id: alertIds },
      attributes: ["id", "notify_email", "notify_inapp"],
    });
    const alertsById = new Map(alerts.map((a) => [a.id, a]));
    // Saved alerts use their own settings; size matches use the shopper's
    const settingsFor = (item) =>
      item.alert_id ? alertsById.get(item.alert_id) : user.notify_size_alerts ? user : null;
    wants = (channel) => items.filter((item) => settingsFor(item)?.[channel]);

    emailItems = wants("notify_email");
    if (emailItems.length > 0) {
      await sendDigestEmail({
        store,
        account,
        alerts: emailItems.filter((i) => i.alert_id),
        sizes: emailItems.filter((i) => !i.alert_id),
      });
    }
  } catch (err) {
    return requeue(items, userId, err);
  }

  const inAppItems = wants("notify_inapp");
  if (inAppItems.length > 0) await deliverInApp(store, userId, inAppItems);

  const notified = items.filter((item) => emailItems.includes(item) || inAppItems.includes(item));
  if (notified.length > 0) await maybeSendText({ store, account, user, items: notified });
};

// Swap each queued snapshot for the product as it is now — the final
// first photo, price, and name. Sold-out items are dropped.
const withCurrentProduct = (pending, inventoryById) =>
  pending
    .map((p) => {
      const current = inventoryById.get(p.inventory_id);
      if (!current || current.available < 1) return null;
      return {
        ...p.get({ plain: true }),
        product_name: current.product_name,
        size: current.size,
        price: current.price,
        compare_at_price: current.compare_at_price,
        image_url: current.image_url,
      };
    })
    .filter(Boolean);

const isSettled = (items, inventoryById, now) => {
  const times = items.flatMap((p) => [
    new Date(p.created_at).getTime(),
    new Date(inventoryById.get(p.inventory_id)?.last_synced_at || 0).getTime(),
  ]);
  const lastActivity = Math.max(...times);
  const firstQueued = Math.min(...items.map((p) => new Date(p.created_at).getTime()));
  return now - lastActivity >= QUIET_MS || now - firstQueued >= MAX_WAIT_MS;
};

// Runs every minute from server.js; sends each shopper's batch (email,
// in-app, push, text) once it has settled
const flushPendingNotifications = async () => {
  const pending = await PendingNotification.findAll({ where: { sent: false } });
  if (pending.length === 0) return;

  const inventoryIds = [...new Set(pending.map((p) => p.inventory_id).filter(Boolean))];
  const inventory = await Inventory.findAll({
    where: { id: inventoryIds },
    attributes: [
      "id", "product_name", "size", "price", "compare_at_price",
      "image_url", "available", "last_synced_at",
    ],
  });
  const inventoryById = new Map(inventory.map((i) => [i.id, i]));

  const groups = new Map();
  for (const p of pending) {
    const key = `${p.store_id}:${p.user_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const now = Date.now();
  for (const [key, items] of groups) {
    if (!isSettled(items, inventoryById, now)) continue;

    await setSent(items, true);
    const current = withCurrentProduct(items, inventoryById);
    if (current.length === 0) continue; // everything sold out meanwhile

    const [storeId, userId] = key.split(":");
    await deliverDigest(storeId, userId, current);
  }
};

module.exports = { flushPendingNotifications };
