const { sequelize } = require("../config/database.js");
const { Inventory } = require("../models/index.js");
const { visitorFor, isBot } = require("../utils/visitor.js");

// Counts shoppers opening a product (its page, the pop-out, or a Coming
// soon item's details) for the platform admin's "Most clicked". One row
// per person per product per day, with how many times they opened it.
// No names or emails: `visitor` is an account id or an anonymous hash.
// Rows older than 90 days are deleted nightly (server.js).
const SOURCES = ["page", "popup", "coming_soon"];

// POST /api/inventory/clicks { product_id, source } — public. Answers at
// once; the count is saved after, and an error is only logged.
const recordProductClick = async (req, res) => {
  res.status(204).end();
  try {
    const productId = String(req.body?.product_id || "");
    const source = SOURCES.includes(req.body?.source) ? req.body.source : null;
    if (!req.store?.id || !source || !/^\d{1,20}$/.test(productId) || isBot(req)) return;
    const owned = await Inventory.findOne({
      where: { store_id: req.store.id, shopify_product_id: productId },
      attributes: ["id"],
    });
    if (!owned) return;
    await sequelize.query(
      `INSERT INTO product_clicks (id, store_id, shopify_product_id, visitor, day, clicks, source, created_at, updated_at)
       VALUES (gen_random_uuid(), :store, :product, :visitor, CURRENT_DATE, 1, :source, NOW(), NOW())
       ON CONFLICT (store_id, shopify_product_id, visitor, day)
       DO UPDATE SET clicks = product_clicks.clicks + 1, updated_at = NOW()`,
      { replacements: { store: req.store.id, product: productId, visitor: visitorFor(req), source } },
    );
  } catch (err) {
    console.error("Product click log error:", err.message);
  }
};

module.exports = { recordProductClick };
