const { Op } = require("sequelize");
const { Inventory } = require("../models/index.js");
const { categorizeProduct, normalizeSize } = require("../utils/categorize.js");
const { detectBrand } = require("../utils/brand.js");
const { readVariant } = require("../utils/variantDetails.js");
const { shopifyGraphql } = require("../utils/shopifyGraphql.js");
const { descriptionFromHtml } = require("../utils/productDescription.js");

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
// Products per page, kept small so each query stays under Shopify's
// per-query cost limit (each product brings up to 50 variants)
const PAGE_SIZE = 15;
const MAX_PAGES = 1000;

const VARIANT_FIELDS = "legacyResourceId title sku price inventoryQuantity selectedOptions { name value }";

const PRODUCTS_QUERY = `
  query ($cursor: String) {
    products(first: ${PAGE_SIZE}, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id legacyResourceId title handle vendor productType tags isGiftCard descriptionHtml
        media(first: 10) { nodes { ... on MediaImage { image { url } } } }
        variants(first: 50) {
          pageInfo { hasNextPage endCursor }
          nodes { ${VARIANT_FIELDS} }
        }
      }
    }
  }
`;

// The rest of a product's variants, for products with more than 50
const MORE_VARIANTS_QUERY = `
  query ($id: ID!, $cursor: String) {
    product(id: $id) {
      variants(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { ${VARIANT_FIELDS} }
      }
    }
  }
`;

const allVariants = async (store, product) => {
  const variants = [...product.variants.nodes];
  let pageInfo = product.variants.pageInfo;
  while (pageInfo.hasNextPage) {
    const data = await shopifyGraphql(store, MORE_VARIANTS_QUERY, { id: product.id, cursor: pageInfo.endCursor });
    const page = data.product?.variants;
    if (!page) break;
    variants.push(...page.nodes);
    pageInfo = page.pageInfo;
  }
  return variants;
};

// GraphQL product → the same shape Shopify's product webhooks send, which
// the rest of SyncStock (categorize, parseVariantTitle) works with
const toProductPayload = (product, variants) => {
  const images = product.media.nodes.map((m) => m.image?.url).filter(Boolean);
  return {
    id: product.legacyResourceId,
    title: product.title,
    handle: product.handle,
    vendor: product.vendor,
    product_type: product.productType,
    tags: product.tags,
    gift_card: product.isGiftCard,
    body_html: product.descriptionHtml,
    images: images.map((src) => ({ src })),
    variants: variants.map((v) => ({
      id: v.legacyResourceId,
      title: v.title,
      sku: v.sku,
      price: v.price,
      inventory_quantity: v.inventoryQuantity,
      option_values: v.selectedOptions || [],
    })),
  };
};

const syncCatalog = async (store, { removeMissing = false } = {}) => {
  const shop = store.shopify_domain;
  const seen = new Set();
  let cursor = null;
  let hasNextPage = true;
  let products = 0;
  let pages = 0;
  let complete = true;

  while (hasNextPage) {
    if (pages >= MAX_PAGES) {
      complete = false;
      console.warn(`Catalog sync hit the ${MAX_PAGES}-page cap for ${shop} — may be incomplete`);
      break;
    }
    let page;
    try {
      page = (await shopifyGraphql(store, PRODUCTS_QUERY, { cursor })).products;
    } catch (error) {
      complete = false;
      console.error(`Catalog sync for ${shop} stopped: ${error.message}`);
      break;
    }

    const pageProducts = [];
    for (const node of page.nodes) {
      pageProducts.push(toProductPayload(node, await allVariants(store, node)));
    }

    for (const product of pageProducts) {
      const category = categorizeProduct(product);
      if (!category) continue; // gift cards aren't listed
      for (const variant of product.variants || []) {
        const { size, condition, boxCondition } = readVariant(product, variant, category);
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
          description: descriptionFromHtml(product.body_html),
          last_synced_at: new Date(),
        });
      }
    }

    products += pageProducts.length;
    pages++;
    hasNextPage = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
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
