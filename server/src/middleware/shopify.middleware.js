const { appThatSigned } = require("../utils/shopifyApps.js");

// Verifies an incoming webhook actually came from Shopify: signed over the
// raw body with the secret of one of SyncStock's Shopify apps
// (utils/shopifyApps.js). Sets req.shopifyApp to the app that signed it.
// Shopify's App Store review checks that a bad signature gets a 401.
const verifyShopifyHmac = (req, res, next) => {
  try {
    const signature = req.headers["x-shopify-hmac-sha256"];
    if (!signature || !Buffer.isBuffer(req.body)) {
      return res.status(401).json({ success: false, message: "Missing Shopify signature" });
    }
    const app = appThatSigned(req.body, signature);
    if (!app) {
      return res.status(401).json({ success: false, message: "Invalid Shopify signature" });
    }
    req.shopifyApp = app;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Webhook verification failed" });
  }
};

// Store webhooks (products, orders, uninstall, billing): the store must be
// resolved first (tenant middleware), and the webhook must come from the
// app that store currently uses. A genuine webhook from the app it moved
// away from is acknowledged and ignored — e.g. the old app's "uninstalled"
// must never take a store that switched apps offline.
const verifyShopifyWebhook = (req, res, next) => {
  if (!req.store) {
    return res.status(401).json({
      success: false,
      message: "Store not resolved before webhook verification",
    });
  }
  return verifyShopifyHmac(req, res, () => {
    const storeApp = req.store.shopify_app || "custom";
    if (req.shopifyApp !== storeApp) {
      console.log(
        `Ignoring ${req.originalUrl.split("/").slice(-2).join("/")} from the ${req.shopifyApp} app for ${req.store.shopify_domain} (store uses the ${storeApp} app)`,
      );
      return res.status(200).json({ received: true, ignored: true });
    }
    next();
  });
};

module.exports = { verifyShopifyWebhook, verifyShopifyHmac };
