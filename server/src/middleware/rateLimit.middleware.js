const rateLimit = require("express-rate-limit");

// Login/signup/password reset — prevents brute force & credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public inventory browsing — prevents scraping. Roomy enough for a
// shopper flipping through filters, sizes and pages (each change loads
// the list, brands and categories), and for several people behind one
// address (a store's wifi, a phone carrier).
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { success: false, message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search suggestions — a request per pause in typing, so they get their
// own allowance rather than using up browsing's (publicLimiter)
const suggestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { success: false, message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Baseline for everything else, per address. A merchant's dashboard,
// the Shopify admin pages and the store's own site all count here, and
// they refresh on their own, so the allowance is generous.
// Shopify's webhooks are never limited: they're signed (checked in
// shopify.middleware.js), and publishing hundreds of products at once
// sends hundreds of them — turning those away loses stock and listing
// updates, and Shopify drops webhooks that keep failing.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  skip: (req) => req.originalUrl.startsWith("/api/webhooks/"),
  message: { success: false, message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, publicLimiter, suggestLimiter, apiLimiter };
