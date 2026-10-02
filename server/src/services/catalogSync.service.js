const { Op } = require("sequelize");
const { Inventory } = require("../models/index.js");
const { parseVariantTitle } = require("../utils/parseVariantTitle.js");
const { categorizeProduct, normalizeSize } = require("../utils/categorize.js");
const { detectBrand } = require("../utils/brand.js");

// Loads a store's whole Shopify catalog into Syncstock's inventory.
// Used when a store connects, and nightly as a safety net for product
// webhooks Shopify failed to deliver (it stops retrying after 48 hours).
//
// removeMissing: pairs in Syncstock but no longer in Shopify (sold and
// deleted, e.g. by Copyt, while a delete webhook was missed) are taken
// off sale. Only done after reading EVERY page successfully — a partial
// read must never mark the rest of the catalog as gone.
// It doesn't send restock alerts for anything it finds; those come from
// the webhooks as things happen.
const MAX_PAGES = 50;

const syncCatalog = async (store, { accessToken = store.shopify_access_token, removeMissing = false } = {}) => {
  const shop = store.shopify_domain;
  const seen = new Set();
  let url = `https://${shop}/admin/api/2025-01/products.json?limit=250`;
  let products = 0;
  let pages = 0;
  let complete = true;

  while (url) {
    if (pages >= MAX_PAGES) {
      complete = false;
      console.warn(`Catalog sync hit the ${MAX_PAGES}-page cap for ${shop} — may be incomplete`);
      break;
    }
    const response = await fetch(url, { headers: { "X-Shopify-Access-Token": accessToken } });
    if (!response.ok) {
      complete = false;
      console.error(`Catalog sync for ${shop} stopped: Shopify returned ${response.status}`);
      break;
    }
    const page = await response.json();

    for (const product of page.products || []) {
      const category = categorizeProduct(product);
      if (!category) continue; // gift cards aren't listed
      for (const variant of product.variants || []) {
        const { size, condition, boxCondition } = parseVariantTitle(variant.title, product.handle);
        seen.add(String(variant.id));
        await Inventory.upsert({
          store_id: store.id,
          shopify_product_id: String(product.id),
          shopify_variant_id: String(variant.id),
          category,
          product_name: product.title,
          brand: detectBrand(product.title, product.vendor, store.name),
          sku: variant.sku || null,
          size: normalizeSize(size, category),
          condition,
          box_status: boxCondition,
          price: parseFloat(variant.price) || null,
          available: variant.inventory_quantity || 0,
          shopify_url: `${store.storefront_url}/products/${product.handle}`,
          image_url: product.images?.[0]?.src || null,
          image_urls: (product.images || []).map((img) => img.src),
          last_synced_at: new Date(),
        });
      }
    }

    products += (page.products || []).length;
    pages++;
    const next = response.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }

  let removed = 0;
  if (removeMissing && complete && seen.size > 0) {
    [removed] = await Inventory.update(
      { available: 0, last_synced_at: new Date() },
      {
        where: {
          store_id: store.id,
          available: { [Op.gt]: 0 },
          shopify_variant_id: { [Op.notIn]: [...seen] },
        },
      },
    );
  }

  return { products, variants: seen.size, removed, complete };
};

// Nightly (server.js): every live store, one at a time
const syncAllCatalogs = async (stores) => {
  for (const store of stores) {
    try {
      const result = await syncCatalog(store, { removeMissing: true });
      console.log(
        `Nightly catalog sync ${store.subdomain}: ${result.products} products, ${result.variants} variants, ` +
          `${result.removed} taken off sale${result.complete ? "" : " (incomplete — nothing removed)"}`,
      );
    } catch (error) {
      console.error(`Nightly catalog sync failed for ${store.subdomain}:`, error.message);
    }
  }
};

module.exports = { syncCatalog, syncAllCatalogs };
