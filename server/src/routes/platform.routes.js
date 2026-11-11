const express = require("express");
const router = express.Router();
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { requirePlatformAdmin } = require("../middleware/platformAdmin.middleware.js");
const { getOverview, getDemand, getSearches, changeSubdomain } = require("../controllers/platformAdmin.controller.js");
const { importSales, getSalesTotals, lookup } = require("../controllers/salesHistory.controller.js");

// SyncStock's own admin page — PLATFORM_ADMIN_EMAILS only
router.use(authenticateAccount, requirePlatformAdmin);
router.get("/overview", getOverview);
router.get("/demand", getDemand);
// What shoppers search for, across every store
router.get("/searches", getSearches);
// Give a store a new <subdomain>.syncstock.io (the old one forwards)
router.put("/stores/:id/subdomain", express.json(), changeSubdomain);
// The Lab's sales history (the All Items Sold sheet, uploaded as CSV)
router.get("/sales", getSalesTotals);
router.get("/sales/lookup", lookup);
router.post("/sales/import", express.text({ type: ["text/csv", "text/plain", "application/vnd.ms-excel"], limit: "15mb" }), importSales);

module.exports = router;
