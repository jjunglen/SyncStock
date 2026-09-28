const express = require("express");
const router = express.Router();
const {
  attachAccountIfPresent,
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const {
  trackRedirect,
  createCartCheckout,
} = require("../controllers/redirect.controller.js");

router.get("/", attachAccountIfPresent, trackRedirect);
router.post("/cart", resolveStoreFromSubdomain, authenticateAccount, createCartCheckout);

module.exports = router;
