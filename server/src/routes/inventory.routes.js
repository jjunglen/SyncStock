const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
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
} = require("../controllers/inventory.controller.js");

router.get("/", publicLimiter, resolveStoreFromSubdomain, getInventory);
// Browsing and single items need an account; only the store page's
// small preview ("/") and the category list stay public
router.get(
  "/search",
  publicLimiter,
  resolveStoreFromSubdomain,
  authenticateAccount,
  searchInventory,
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
router.get(
  "/brands",
  publicLimiter,
  resolveStoreFromSubdomain,
  authenticateAccount,
  getBrands,
);
router.get(
  "/:id/sizes",
  publicLimiter,
  resolveStoreFromSubdomain,
  authenticateAccount,
  getProductSizes,
);
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
