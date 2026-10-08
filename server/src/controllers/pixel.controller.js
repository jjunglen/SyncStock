const { Store } = require("../models/index.js");
const { recordPixelCheckout, UUID_RE } = require("../services/attribution.service.js");

// POST /api/pixel/checkout — sent by the store's web pixel when a
// checkout completes in a browser that came from a Syncstock click.
// Body (text/plain JSON, so the browser skips a CORS preflight):
//   { shop: "x.myshopify.com", order_id: "123" | "gid://…/123", click_ids: [uuid] }
// Nothing here is trusted for money: the claim only says which click to
// check, and the order itself is read from Shopify. A click must belong
// to this store, match a variant in the order, and be recent.
const handlePixelCheckout = async (req, res) => {
  // Reply straight away — the pixel doesn't wait on the result
  res.status(204).end();

  try {
    const body = JSON.parse(req.body || "{}");
    const shop = String(body.shop || "").toLowerCase();
    const orderId = String(body.order_id || "").match(/(\d+)$/)?.[1];
    const clickIds = [...new Set(Array.isArray(body.click_ids) ? body.click_ids : [])]
      .map(String)
      .filter((id) => UUID_RE.test(id))
      // The pixel remembers up to 10 recent clicks
      .slice(0, 10);

    if (!shop.endsWith(".myshopify.com") || !orderId || clickIds.length === 0) return;

    const store = await Store.findOne({ where: { shopify_domain: shop } });
    if (!store) return;

    await recordPixelCheckout(store, orderId, clickIds);
  } catch (error) {
    console.error("Pixel checkout error:", error.message);
  }
};

module.exports = { handlePixelCheckout };
