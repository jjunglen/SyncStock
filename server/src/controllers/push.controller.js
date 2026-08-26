const { PushSubscription, User } = require("../models/index.js");

// Resolves the store-scoped User (membership) row for the logged-in
// Account — PushSubscription.user_id points here, not at Account directly
const resolveMembership = async (req, res) => {
  if (!req.account || !req.store) {
    res.status(401).json({ success: false, message: "Not logged in" });
    return null;
  }

  const membership = await User.findOne({
    where: { account_id: req.account.id, store_id: req.store.id },
  });

  if (!membership) {
    res
      .status(403)
      .json({ success: false, message: "Not a member of this store" });
    return null;
  }

  return membership;
};

// POST /api/push/subscribe
const subscribe = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const { endpoint, keys } = req.body;
    const { p256dh, auth } = keys;

    const [sub, created] = await PushSubscription.findOrCreate({
      where: { store_id: req.store.id, user_id: membership.id, endpoint },
      defaults: { p256dh, auth },
    });

    if (!created) {
      await sub.update({ p256dh, auth });
    }

    return res
      .status(200)
      .json({ success: true, message: "Subscribed to push notifications" });
  } catch (error) {
    console.error("Subscribe error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Subscribe failed" });
  }
};

// DELETE /api/push/subscribe
const unsubscribe = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const { endpoint } = req.body;

    await PushSubscription.destroy({
      where: { store_id: req.store.id, user_id: membership.id, endpoint },
    });

    return res
      .status(200)
      .json({ success: true, message: "Unsubscribed from push notifications" });
  } catch (error) {
    console.error("Unsubscribe error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Unsubscribe failed" });
  }
};

module.exports = { subscribe, unsubscribe };
