const express = require("express");
const router = express.Router();
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { requirePlatformAdmin } = require("../middleware/platformAdmin.middleware.js");
const { getOverview, getDemand } = require("../controllers/platformAdmin.controller.js");

// SyncStock's own admin page — PLATFORM_ADMIN_EMAILS only
router.use(authenticateAccount, requirePlatformAdmin);
router.get("/overview", getOverview);
router.get("/demand", getDemand);

module.exports = router;
