const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { requireAdmin } = require("../middleware/admin.middleware.js");
const {
  initiateShopifyConnect,
  handleShopifyCallback,
  updateSubdomain,
  selectPlan,
  getStore,
} = require("../controllers/store.controller.js");

// No store resolution on these two — a store doesn't exist yet when
// OAuth connect begins, and gets created partway through the callback.
router.get("/shopify/connect", initiateShopifyConnect);
router.get("/shopify/callback", handleShopifyCallback);

router.put(
  "/subdomain",
  resolveStoreFromSubdomain,
  authenticateAccount,
  requireAdmin,
  updateSubdomain,
);
router.put(
  "/plan",
  resolveStoreFromSubdomain,
  authenticateAccount,
  requireAdmin,
  selectPlan,
);
router.get("/", resolveStoreFromSubdomain, getStore);

module.exports = router;
