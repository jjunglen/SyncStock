const { Op } = require("sequelize");
const { ProductDrop, Store, Inventory, User, Account, NotificationLog } = require("../models/index.js");
const { findMatchingAlerts, meetsPreferences } = require("./alert.service.js");
const { sendDropReminderEmail } = require("./email.service.js");
const { sendPushNotification } = require("./push.service.js");
const { sendAppNotification } = require("./appPush.service.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");
const { isCategoryEnabled } = require("../utils/storeSettings.js");

// "Dropping soon" reminders: about an hour before a Coming soon item's
// drop time (ProductDrop, set by the merchant), each shopper with a
// matching alert hears once — by email and in-app/push, following the
// same switches as their restock alerts. The restock alert itself still
// goes out when the stock lands. Runs every minute (server.js).
// A drop time set less than an hour ahead is reminded right away.
const WINDOW_MS = 60 * 60 * 1000;

// "in about an hour", "in 20 minutes"
const whenText = (dropsAt) => {
  const minutes = Math.max(1, Math.round((new Date(dropsAt).getTime() - Date.now()) / 60000));
  if (minutes >= 45) return "in about an hour";
  return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
};

// One shopper per alert, the first matching size row for each
const alertsFor = async (store, rows) => {
  const byUser = new Map();
  for (const row of rows) {
    if (!isCategoryEnabled(store, row.category)) continue;
    const alerts = await findMatchingAlerts(store, row);
    for (const alert of alerts) {
      if (byUser.has(alert.user_id) || !meetsPreferences(alert, row)) continue;
      byUser.set(alert.user_id, { alert, row });
    }
  }
  return [...byUser.values()];
};

const remindOne = async ({ store, drop, alert, row, item }) => {
  const user = await User.findByPk(alert.user_id);
  if (!user) return false;
  const account = await Account.findByPk(user.account_id);
  if (!account) return false;
  const when = whenText(drop.drops_at);
  const href = `${storeBaseUrl(store)}/store/dashboard?tab=coming`;
  let told = false;

  if (user.notify_email && alert.notify_email) {
    try {
      await sendDropReminderEmail({ store, account, membershipId: user.id, item, when, href });
      told = true;
    } catch (err) {
      console.error(`Drop reminder email failed for user ${user.id}:`, err.message);
    }
  }
  if (user.notify_inapp && alert.notify_inapp) {
    try {
      const body = `${item.name} drops ${when}`;
      await NotificationLog.create({
        store_id: store.id,
        user_id: user.id,
        alert_id: alert.id,
        inventory_id: row.id,
        channel: "in_app",
        image_url: item.image_url,
        message: `${body} at ${store.name}`,
      });
      const push = { title: "Dropping soon", body, icon: item.image_url || "/icon-192.png", url: href };
      await sendPushNotification(store.id, user.id, push);
      await sendAppNotification(account.id, { title: push.title, body, url: href, image: item.image_url });
      told = true;
    } catch (err) {
      console.error(`Drop reminder in-app/push failed for user ${user.id}:`, err.message);
    }
  }
  return told;
};

const remindForDrop = async (drop) => {
  const store = await Store.findByPk(drop.store_id);
  if (!store || !store.coming_soon) return 0;
  const rows = await Inventory.findAll({
    where: { store_id: store.id, shopify_product_id: drop.shopify_product_id },
    raw: true,
  });
  // Already in stock: the restock alert has it covered
  if (rows.length === 0 || rows.some((r) => r.available > 0)) return 0;
  const first = rows[0];
  const item = {
    name: first.product_name,
    image_url: rows.find((r) => r.image_url)?.image_url || null,
    sizes: [...new Set(rows.map((r) => r.size).filter(Boolean))],
  };
  let sent = 0;
  for (const { alert, row } of await alertsFor(store, rows)) {
    if (await remindOne({ store, drop, alert, row, item })) sent += 1;
  }
  return sent;
};

const sendDropReminders = async () => {
  const now = new Date();
  const due = await ProductDrop.findAll({
    where: { reminded_at: null, drops_at: { [Op.gt]: now, [Op.lte]: new Date(now.getTime() + WINDOW_MS) } },
    limit: 50,
  });
  for (const drop of due) {
    // Claimed first, so two runs can never remind twice
    const [claimed] = await ProductDrop.update({ reminded_at: now }, { where: { id: drop.id, reminded_at: null } });
    if (!claimed) continue;
    try {
      const sent = await remindForDrop(drop);
      console.log(`Drop reminder for product ${drop.shopify_product_id} (store ${drop.store_id}): ${sent} shopper${sent === 1 ? "" : "s"}`);
    } catch (err) {
      console.error(`Drop reminder failed for product ${drop.shopify_product_id}:`, err.message);
    }
  }
};

module.exports = { sendDropReminders, whenText };
