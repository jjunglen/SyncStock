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
} = require("../controllers/analytics.controller.js");

router.get("/sourcing-demand", authenticateAccount, resolveStoreFromAdminMembership, getSourcingDemand);
router.get("/revenue", authenticateAccount, resolveStoreFromAdminMembership, getRevenue);
router.get("/funnel", authenticateAccount, resolveStoreFromAdminMembership, getFunnel);
router.get("/customer-count", authenticateAccount, resolveStoreFromAdminMembership, getCustomerCount);
router.get("/purchases", authenticateAccount, resolveStoreFromAdminMembership, getPurchases);

module.exports = router;