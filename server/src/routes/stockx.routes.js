const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { attachStoreIfPresent } = require("../middleware/tenant.middleware.js");
const {
  searchCatalog,
  handleOAuthCallback,
  getAuthUrl,
} = require("../controllers/stockx.controller.js");

// Every store's shoppers share one StockX API key and its request limit,
// so each person gets a fair share. "Track a shoe" searches as you type
// (after a short pause), so this still allows plenty of normal searching.
const searchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: { success: false, message: "Too many searches — give it a minute and try again" },
  standardHeaders: true,
  legacyHeaders: false,
});

// The store (from the site the shopper is on) lets its own photos fill in
// where StockX has none
router.get("/search", authenticateAccount, searchLimiter, attachStoreIfPresent, searchCatalog);

// Getting a new StockX refresh token (visit /api/stockx/auth, sign in to
// StockX, copy the token into STOCKX_REFRESH_TOKEN). Off unless
// STOCKX_OAUTH_SETUP=true, so strangers can't use the app's StockX login;
// turn it on only while re-authorizing.
if (process.env.STOCKX_OAUTH_SETUP === "true") {
  router.get("/auth", getAuthUrl);
  router.get("/callback", handleOAuthCallback);
}

module.exports = router;
