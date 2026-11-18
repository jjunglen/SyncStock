const express = require("express");
const router = express.Router();
const {
  resolveStoreFromShopifyDomain,
} = require("../middleware/tenant.middleware.js");
const {
  verifyShopifyWebhook,
  verifyShopifyHmac,
} = require("../middleware/shopify.middleware.js");
const {
  handleProductCreate,
  handleProductUpdate,
  handleProductDelete,
  handleOrderCreate,
  handleOrderCancelled,
  handleRefundCreate,
  handleListingAddOrUpdate,
  handleListingRemove,
} = require("../controllers/webhook.controller.js");
const {
  handleComplianceWebhook,
  handleAppUninstalled,
} = require("../controllers/compliance.controller.js");
const { handleSubscriptionUpdate } = require("../controllers/billing.controller.js");
const { checkThemeSetup } = require("../services/themeSetup.service.js");

// Shopify's privacy webhooks can arrive after the store is gone, so they
// only need a valid signature, not a store. Registered before the
// router.use below so it never runs for them.
router.post("/compliance", verifyShopifyHmac, handleComplianceWebhook);

// Order matters: resolve which store this webhook belongs to FIRST,
// then verify the signature using THAT store's own webhook secret
router.use(resolveStoreFromShopifyDomain, verifyShopifyWebhook);

router.post("/products/create", handleProductCreate);
router.post("/products/update", handleProductUpdate);
router.post("/products/delete", handleProductDelete);
// Sales-channel stores: published to / changed on / removed from SyncStock
router.post("/product_listings/add", handleListingAddOrUpdate);
router.post("/product_listings/update", handleListingAddOrUpdate);
router.post("/product_listings/remove", handleListingRemove);
router.post("/orders/create", handleOrderCreate);
router.post("/orders/cancelled", handleOrderCancelled);
router.post("/refunds/create", handleRefundCreate);
router.post("/app/uninstalled", handleAppUninstalled);
router.post("/app_subscriptions/update", handleSubscriptionUpdate);
// Another theme went live: is SyncStock's button on it
// (themeSetup.service.js). Replies first; Shopify gives up after 5 seconds.
router.post("/themes/publish", (req, res) => {
  res.status(200).json({ received: true });
  checkThemeSetup(req.store).catch((err) =>
    console.error(`Theme check after publish failed for ${req.store.shopify_domain}:`, err.message),
  );
});

module.exports = router;
