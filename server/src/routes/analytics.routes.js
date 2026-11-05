const express = require("express");
const router = express.Router();
const { resolveStoreFromAdminMembership } = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const {
  getSourcingDemand,
  getRevenue,
  getFunnel,
  getCustomerCount,
  getPurchases,
  getMostViewed,
  getPriceCheck,
  refreshPriceCheck,
} = require("../controllers/analytics.controller.js");
const { getListingPrices } = require("../controllers/pricing.controller.js");

router.get("/sourcing-demand", authenticateAccount, resolveStoreFromAdminMembership, getSourcingDemand);
router.get("/revenue", authenticateAccount, resolveStoreFromAdminMembership, getRevenue);
router.get("/funnel", authenticateAccount, resolveStoreFromAdminMembership, getFunnel);
router.get("/customer-count", authenticateAccount, resolveStoreFromAdminMembership, getCustomerCount);
router.get("/purchases", authenticateAccount, resolveStoreFromAdminMembership, getPurchases);
router.get("/most-viewed", authenticateAccount, resolveStoreFromAdminMembership, getMostViewed);
// Price check (flagship store): brand-new pairs vs StockX
router.get("/price-check", authenticateAccount, resolveStoreFromAdminMembership, getPriceCheck);
router.post("/price-check/refresh", authenticateAccount, resolveStoreFromAdminMembership, refreshPriceCheck);
// Pricing page (beta): listings against the store's own past sales
router.get("/listing-prices", authenticateAccount, resolveStoreFromAdminMembership, getListingPrices);

module.exports = router;