const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomainOrAdmin,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount, requireFullLogin } = require("../middleware/auth.middleware.js");
const {
  getProfile,
  updateProfile,
  deleteAccount,
} = require("../controllers/user.controller.js");

// Shoppers use these on a store's site; merchants on the dashboard
router.use(authenticateAccount, resolveStoreFromSubdomainOrAdmin);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.delete("/profile", requireFullLogin, deleteAccount);

module.exports = router;
