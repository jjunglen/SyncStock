const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize, Store } = require("../models/index.js");
const { detectBrand } = require("../utils/brand.js");

// One-time: adds inventory.brand (for the dashboard's Brand filter) and
// fills it for every store's existing items from Shopify's product
// titles and vendors (utils/brand.js). New and updated products get
// their brand from the product webhooks. Read-only against Shopify;
// additive and safe to re-run.
//
// Run BEFORE starting a server with the updated Inventory model.
//
// Usage: node src/scripts/migrateInventoryBrand.js
const run = async () => {
  await sequelize.query(`ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS brand VARCHAR(255)`);
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS inventory_store_id_brand ON public.inventory (store_id, brand)`,
  );

  const stores = await Store.findAll();
  for (const store of stores) {
    if (!store.shopify_domain || !store.shopify_access_token) continue;
    let url = `https://${store.shopify_domain}/admin/api/2025-01/products.json?limit=250&fields=id,title,vendor`;
    const byBrand = {};
    let products = 0;

    while (url) {
      const response = await fetch(url, {
        headers: { "X-Shopify-Access-Token": store.shopify_access_token },
      });
      if (!response.ok) {
        // e.g. an uninstalled app or revoked token — skip, don't stop the run
        console.warn(`${store.subdomain}: skipped — Shopify returned ${response.status}`);
        break;
      }
      const page = await response.json();
      for (const product of page.products || []) {
        const brand = detectBrand(product.title, product.vendor, store.name);
        (byBrand[brand] ||= []).push(String(product.id));
        products++;
      }
      const next = response.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }

    // One UPDATE per brand rather than per product
    for (const [brand, ids] of Object.entries(byBrand)) {
      await sequelize.query(
        `UPDATE public.inventory SET brand = :brand WHERE store_id = :storeId AND shopify_product_id IN (:ids)`,
        { replacements: { brand: brand === "null" ? null : brand, storeId: store.id, ids } },
      );
    }
    if (products > 0) {
      console.log(`${store.subdomain}: ${products} products, ${Object.keys(byBrand).length} brands`);
    }
  }

  console.log("Done — inventory brands filled in.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
