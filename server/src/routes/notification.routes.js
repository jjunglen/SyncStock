const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} = require("../controllers/notification.controller.js");

// Same pattern as alerts — every notification is tied to a specific
// account, no public equivalent
router.use(resolveStoreFromSubdomain, authenticateAccount);

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/", deleteAllNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;
