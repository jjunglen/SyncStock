const crypto = require("crypto");

// Verifies an incoming webhook actually came from Shopify.
const verifyShopifyWebhook = (req, res, next) => {
  try {
    if (!req.store) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Store not resolved before webhook verification",
        });
    }

    const shopifySig = req.headers["x-shopify-hmac-sha256"];

    if (!shopifySig) {
      return res
        .status(401)
        .json({ success: false, message: "Missing Shopify signature" });
    }

    const generateSig = crypto
      .createHmac("sha256", req.store.shopify_webhook_secret)
      .update(req.body)
      .digest("base64");

    const shopifyBuffer = Buffer.from(shopifySig, "base64");
    const generatedBuffer = Buffer.from(generateSig, "base64");

    if (
      shopifyBuffer.length !== generatedBuffer.length ||
      !crypto.timingSafeEqual(shopifyBuffer, generatedBuffer)
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Shopify signature" });
    }

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Webhook verification failed" });
  }
};

module.exports = { verifyShopifyWebhook };
