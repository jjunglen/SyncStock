const { Op } = require("sequelize");
const {
  PendingNotification,
  Store,
  User,
  Account,
} = require("../models/index.js");
const { sendDigestEmail } = require("./email.service.js");
const { sendDigestText } = require("./sms.service.js");

const quickFlushTimers = new Map();
const QUICK_FLUSH_DELAY_MS = 30000;

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

// Sends one user's digest. Items are already marked sent (so a
// concurrent flush can't pick them up too); if the email fails they're
// put back in the queue for the next cron run.
const deliverDigest = async (storeId, userId, items) => {
  try {
    const store = await Store.findByPk(storeId);
    const user = await User.findByPk(userId);
    if (!store || !user) return;

    const account = await Account.findByPk(user.account_id);
    if (!account) return;

    await sendDigestEmail({ store, account, items });
    await maybeSendText({ store, account, user, items });
  } catch (err) {
    console.error(`Digest send failed for user ${userId}:`, err.message);
    await setSent(items, false).catch((resetErr) =>
      console.error("Digest requeue error:", resetErr.message),
    );
  }
};

const flushForUser = async (storeId, userId) => {
  const pending = await PendingNotification.findAll({
    where: { store_id: storeId, user_id: userId, sent: false },
  });
  if (pending.length === 0) return;

  await setSent(pending, true);
  await deliverDigest(storeId, userId, pending);
};

const scheduleQuickFlush = (storeId, userId) => {
  const key = `${storeId}:${userId}`;

  if (quickFlushTimers.has(key)) {
    clearTimeout(quickFlushTimers.get(key));
  }

  const timeoutId = setTimeout(() => {
    quickFlushTimers.delete(key);
    flushForUser(storeId, userId).catch((err) =>
      console.error("Quick flush error:", err.message),
    );
  }, QUICK_FLUSH_DELAY_MS);

  quickFlushTimers.set(key, timeoutId);
};

const flushPendingNotifications = async () => {
  const pending = await PendingNotification.findAll({ where: { sent: false } });
  if (pending.length === 0) return;

  await setSent(pending, true);

  const groups = new Map();
  for (const p of pending) {
    const key = `${p.store_id}:${p.user_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  for (const [key, items] of groups) {
    const [storeId, userId] = key.split(":");
    await deliverDigest(storeId, userId, items);
  }
};

module.exports = { flushPendingNotifications, scheduleQuickFlush };
