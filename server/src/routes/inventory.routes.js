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
} = require("../controllers/inventory.controller.js");

router.get("/", publicLimiter, resolveStoreFromSubdomain, getInventory);
router.get(
  "/search",
  publicLimiter,
  resolveStoreFromSubdomain,
  searchInventory,
);
router.get(
  "/my-sizes",
  resolveStoreFromSubdomain,
  authenticateAccount,
  getInventoryInMySizes,
);
router.get("/:id", publicLimiter, resolveStoreFromSubdomain, getInventoryItem);

module.exports = router;
