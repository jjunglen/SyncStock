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

const flushForUser = async (storeId, userId) => {
  const pending = await PendingNotification.findAll({
    where: { store_id: storeId, user_id: userId, sent: false },
  });
  if (pending.length === 0) return;

  await PendingNotification.update(
    { sent: true },
    { where: { id: { [Op.in]: pending.map((p) => p.id) } } },
  );

  const store = await Store.findByPk(storeId);
  const user = await User.findByPk(userId);
  if (!store || !user) return;

  const account = await Account.findByPk(user.account_id);
  if (!account) return;

  await sendDigestEmail({ store, account, items: pending });
  await maybeSendText({ store, account, user, items: pending });
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

  await PendingNotification.update(
    { sent: true },
    { where: { id: { [Op.in]: pending.map((p) => p.id) } } },
  );

  const groups = new Map();
  for (const p of pending) {
    const key = `${p.store_id}:${p.user_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  for (const [key, items] of groups) {
    const [storeId, userId] = key.split(":");
    const store = await Store.findByPk(storeId);
    const user = await User.findByPk(userId);
    if (!store || !user) continue;

    const account = await Account.findByPk(user.account_id);
    if (!account) continue;

    await sendDigestEmail({ store, account, items });
    await maybeSendText({ store, account, user, items });
  }
};

module.exports = { flushPendingNotifications, scheduleQuickFlush };
