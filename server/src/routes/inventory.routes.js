const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
  attachAccountIfPresent,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { publicLimiter } = require("../middleware/rateLimit.middleware.js");
const {
  getInventory,
  getInventoryItem,
  searchInventory,
  getInventoryInMySizes,
  getCategories,
  getBrands,
  getProductSizes,
  recordProductView,
  getTrackableProducts,
  getPublicProduct,
} = require("../controllers/inventory.controller.js");

router.get("/", publicLimiter, resolveStoreFromSubdomain, getInventory);
// Browsing is public (the store's /browse and /p/ pages, open to search
// engines too); alerts, sizes and anything personal need an account
router.get("/search", publicLimiter, resolveStoreFromSubdomain, searchInventory);
// A product's public page (/p/<id>-<name>)
router.get("/product/:productId", publicLimiter, resolveStoreFromSubdomain, getPublicProduct);
// "Track a new item": the store's own products, sold-out ones included
router.get(
  "/trackable",
  publicLimiter,
  resolveStoreFromSubdomain,
  authenticateAccount,
  getTrackableProducts,
);
router.get(
  "/my-sizes",
  resolveStoreFromSubdomain,
  authenticateAccount,
  getInventoryInMySizes,
);
router.get(
  "/categories",
  publicLimiter,
  resolveStoreFromSubdomain,
  getCategories,
);
// The same, signed in: adds each category's count in the shopper's sizes
router.get(
  "/categories/mine",
  resolveStoreFromSubdomain,
  authenticateAccount,
  getCategories,
);
// Public; scope=my-sizes (the In stock tab) needs an account
router.get(
  "/brands",
  publicLimiter,
  resolveStoreFromSubdomain,
  attachAccountIfPresent,
  getBrands,
);
router.get("/:id/sizes", publicLimiter, resolveStoreFromSubdomain, getProductSizes);
// "3 people viewed this" (product pop-out)
router.post(
  "/:id/view",
  publicLimiter,
  resolveStoreFromSubdomain,
  authenticateAccount,
  recordProductView,
);
router.get(
  "/:id",
  publicLimiter,
  resolveStoreFromSubdomain,
  authenticateAccount,
  getInventoryItem,
);

module.exports = router;
