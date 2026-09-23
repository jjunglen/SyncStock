const webpush = require("web-push");
const { PushSubscription } = require("../models/index.js");

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// Sends to every device a user has subscribed on for this store — a
// PushSubscription row IS the opt-in (created by Profile's "Enable"
// button, removed by "Disable"), so no separate preference flag is
// needed, unlike email/in-app which have explicit toggles.
const sendPushNotification = async (storeId, userId, payload) => {
  try {
    const subscriptions = await PushSubscription.findAll({
      where: { store_id: storeId, user_id: userId },
    });

    if (subscriptions.length === 0) return;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
          );
        } catch (err) {
          // 404/410 means the browser has permanently invalidated this
          // subscription (uninstalled, cleared data, etc.) — clean it
          // up rather than let dead subscriptions accumulate and fail
          // silently forever.
          if (err.statusCode === 404 || err.statusCode === 410) {
            await sub.destroy();
          } else {
            console.error("Push send error:", err.message);
          }
        }
      }),
    );
  } catch (error) {
    console.error("Send push notification error:", error.message);
  }
};

module.exports = { sendPushNotification };
