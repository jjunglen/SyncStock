const { Op } = require("sequelize");
const {
  PendingNotification,
  Store,
  User,
  Account,
} = require("../models/index.js");
const { sendDigestEmail } = require("./email.service.js");

// In-memory timers, keyed by "storeId:userId" — best-effort speedup
// only. Doesn't survive a server restart, which is why the cron
// sweep below still exists as the real guarantee.
const quickFlushTimers = new Map();
const QUICK_FLUSH_DELAY_MS = 15000;

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
};

// Called every time a new item gets queued. Resets a 5-second
// countdown for this user — if nothing else arrives in time, send
// right away instead of waiting for the next full cron sweep.
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

// Safety net — runs on the fixed cron schedule, catches anything the
// quick-flush timers missed (e.g. after a restart).
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
  }
};

module.exports = { flushPendingNotifications, scheduleQuickFlush };
