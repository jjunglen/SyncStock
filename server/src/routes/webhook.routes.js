const express = require("express");
const router = express.Router();
const {
  resolveStoreFromShopifyDomain,
} = require("../middleware/tenant.middleware.js");
const { verifyShopifyWebhook } = require("../middleware/shopify.middleware.js");
const {
  handleProductCreate,
  handleProductUpdate,
  handleProductDelete,
  handleOrderCreate,
} = require("../controllers/webhook.controller.js");

// Order matters: resolve which store this webhook belongs to FIRST,
// then verify the signature using THAT store's own webhook secret
router.use(resolveStoreFromShopifyDomain, verifyShopifyWebhook);

router.post("/products/create", handleProductCreate);
router.post("/products/update", handleProductUpdate);
router.post("/products/delete", handleProductDelete);
router.post("/orders/create", handleOrderCreate);

module.exports = router;
