const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize, Store, Inventory } = require("../models/index.js");
const { parseVariantTitle } = require("../utils/parseVariantTitle.js");
const { categorizeProduct, normalizeSize } = require("../utils/categorize.js");

// One-time: sorts existing inventory into sneakers / clothing /
// trading_cards using each product's Shopify type, tags, and title
// (every sync used to hardcode "sneakers"). Read-only against Shopify.
// Without --apply it only reports what would change.
//
// Usage: node src/scripts/recategorizeInventory.js [--apply]
const apply = process.argv.includes("--apply");

const run = async () => {
  const stores = await Store.findAll();
  for (const store of stores) {
    if (!store.shopify_domain || !store.shopify_access_token) continue;

    const totals = { products: 0, changed: 0, sneakers: 0, clothing: 0, trading_cards: 0 };
    const examples = { clothing: [], trading_cards: [] };
    let url = `https://${store.shopify_domain}/admin/api/2025-01/products.json?limit=250&fields=id,title,product_type,tags,variants`;

    while (url) {
      const response = await fetch(url, {
        headers: { "X-Shopify-Access-Token": store.shopify_access_token },
      });
      if (!response.ok) {
        // e.g. an uninstalled app or revoked token — skip, don't stop the run
        console.warn(`\n${store.subdomain}: skipped — Shopify returned ${response.status}`);
        break;
      }
      const { products } = await response.json();

      for (const product of products) {
        const category = categorizeProduct(product);
        if (!category) continue; // gift cards aren't listed
        totals.products++;
        totals[category]++;
        if (examples[category]?.length < 5) examples[category].push(product.title);

        for (const variant of product.variants || []) {
          const size = normalizeSize(parseVariantTitle(variant.title).size, category);
          const where = { store_id: store.id, shopify_variant_id: String(variant.id) };
          const row = await Inventory.findOne({ where, attributes: ["id", "category", "size"] });
          if (!row || (row.category === category && row.size === size)) continue;
          totals.changed++;
          if (apply) await Inventory.update({ category, size }, { where });
        }
      }

      const next = response.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }

    if (totals.products === 0) continue;
    console.log(`\n${store.subdomain}:`, totals);
    console.log("  clothing e.g.:", examples.clothing);
    console.log("  trading cards e.g.:", examples.trading_cards);
  }
  console.log(apply ? "\nApplied." : "\nDry run — nothing changed. Re-run with --apply to save.");
  await sequelize.close();
};

run().catch((err) => {
  console.error("Recategorize failed:", err.message);
  process.exit(1);
});
