const express = require("express");
const router = express.Router();
const { apiLimiter } = require("../middleware/rateLimit.middleware.js");
const { handlePixelCheckout } = require("../controllers/pixel.controller.js");

// Mounted BEFORE the app-wide CORS rule in server.js: the pixel runs on
// merchants' own storefront domains (in Shopify's sandbox), which that
// rule would refuse. Open to any origin, no cookies — it only accepts
// claims that are checked against Shopify's order.
router.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

router.post(
  "/checkout",
  apiLimiter,
  express.text({ type: "*/*", limit: "10kb" }),
  handlePixelCheckout,
);

module.exports = router;
