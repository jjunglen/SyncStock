const { NotificationLog, User } = require("../models/index.js");
const { getPagination, buildMeta } = require("../utils/pagination.js");

// Resolves the store-scoped User (membership) row for the logged-in
// Account — NotificationLog.user_id points here, not at Account directly
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

// GET /api/notifications?page=1&limit=20 — in-app notifications for this user, this store
const getNotifications = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const { page, limit, offset } = getPagination(req.query);

    const { count, rows } = await NotificationLog.findAndCountAll({
      where: {
        store_id: req.store.id,
        user_id: membership.id,
        channel: "in_app",
      },
      order: [["sent_at", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: buildMeta(count, page, limit),
    });
  } catch (error) {
    console.error("Get notifications error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch notifications" });
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const notification = await NotificationLog.findOne({
      where: { id: req.params.id, store_id: req.store.id },
    });

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    if (notification.user_id !== membership.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await notification.update({ read: true });

    return res
      .status(200)
      .json({
        success: true,
        data: notification,
        message: "Notification marked as read",
      });
  } catch (error) {
    console.error("Mark as read error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update notification" });
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    await NotificationLog.update(
      { read: true },
      {
        where: { store_id: req.store.id, user_id: membership.id, read: false },
      },
    );

    return res
      .status(200)
      .json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all as read error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update notifications" });
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const notification = await NotificationLog.findOne({
      where: { id: req.params.id, store_id: req.store.id },
    });

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    if (notification.user_id !== membership.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await notification.destroy();

    return res
      .status(200)
      .json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Delete notification error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete notification" });
  }
};

// DELETE /api/notifications
const deleteAllNotifications = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    await NotificationLog.destroy({
      where: { store_id: req.store.id, user_id: membership.id },
    });

    return res
      .status(200)
      .json({
        success: true,
        message: "All notifications deleted successfully",
      });
  } catch (error) {
    console.error("Delete all notifications error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete notifications" });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
};
