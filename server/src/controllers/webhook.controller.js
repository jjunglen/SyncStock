const { Inventory } = require("../models/index.js");
const { readVariant } = require("../utils/variantDetails.js");
const { categorizeProduct, normalizeSize } = require("../utils/categorize.js");
const { detectBrand } = require("../utils/brand.js");
const { descriptionFromHtml } = require("../utils/productDescription.js");
const {
  checkAlertsForInventory,
  checkPriceDropAlerts,
} = require("../services/alert.service.js");
const { attributeOrder, refreshOrderRefunds } = require("../services/attribution.service.js");
const { isChannelStore, sendProductFeedback } = require("../services/channel.service.js");
const autoPublish = require("../services/autoPublish.service.js");

// What "published" means for a store:
//   the Lab (custom app): live on its Online Store (Shopify's published_at)
//   sales-channel stores (public app): published to the SyncStock channel —
//     set only by the product_listings webhooks below and the catalog sync,
//     never by the product webhooks (which don't say)
// Shoppers of sales-channel stores only see published items
// (inventory.controller.js listable).

// Product webhooks reply before doing any work: Shopify gives up after 5
// seconds, and a bulk edit sends hundreds at once — saving every size
// first queued them on the database until Shopify timed out and removed
// the webhook. A failure after replying is logged; the nightly catalog
// sync repairs the inventory.
const handleProductCreate = async (req, res) => {
  res.status(200).json({ received: true });
  try {
    const store = req.store;
    const data = JSON.parse(req.body);
    const variants = data.variants || [];
    const category = categorizeProduct(data);
    if (!category) return; // gift cards aren't listed

    const channel = isChannelStore(store);
    for (const variant of variants) {
      const { size, condition, boxCondition } = readVariant(data, variant, category);

      await Inventory.upsert({
        store_id: store.id,
        shopify_product_id: String(data.id),
        shopify_variant_id: String(variant.id),
        category,
        product_name: data.title,
        brand: detectBrand(data.title, data.vendor, store.name),
        sku: variant.sku || null,
        size: normalizeSize(size, category),
        condition: condition,
        box_status: boxCondition,
        price: parseFloat(variant.price) || null,
        available: variant.inventory_quantity || 0,
        shopify_url: `${store.storefront_url}/products/${data.handle}`,
        image_url: data.images?.[0]?.src || null,
        image_urls: (data.images || []).map((img) => img.src),
        // Sales-channel stores: left as is (a listing webhook may already
        // have marked it published)
        ...(!channel && { published: !!data.published_at }),
        description: descriptionFromHtml(data.body_html),
        last_synced_at: new Date(),
      });
    }

    const isPublished = channel
      ? (await Inventory.count({ where: { store_id: store.id, shopify_product_id: String(data.id), published: true } })) > 0
      : !!data.published_at;

    // Automatic publishing (if the merchant turned it on): publish it to
    // SyncStock; Shopify's listing webhook then shows it and alerts
    if (channel) await autoPublish.applyToProduct(store, data, isPublished);
    const hasImage = !!data.images?.[0]?.src;

    if (!isPublished || !hasImage) {
      console.log(
        `Skipping alert check — ${data.title} not ready yet (published: ${isPublished}, image: ${hasImage}) (store ${store.id})`,
      );
      return;
    }

    const notifiedUsers = new Set();

    for (const variant of variants) {
      if (!variant.inventory_quantity || variant.inventory_quantity < 1) {
        continue;
      }

      const inventoryItem = await Inventory.findOne({
        where: { store_id: store.id, shopify_variant_id: String(variant.id) },
      });

      if (inventoryItem) {
        await checkAlertsForInventory(store, inventoryItem, notifiedUsers);
      }
    }
  } catch (error) {
    console.error("Product create webhook error:", error.message);
  }
};

const handleProductDelete = async (req, res) => {
  res.status(200).json({ received: true });
  try {
    const store = req.store;
    const data = JSON.parse(req.body);

    await Inventory.update(
      { available: 0, last_synced_at: new Date() },
      { where: { store_id: store.id, shopify_product_id: String(data.id) } },
    );
  } catch (error) {
    console.error("Product delete webhook error:", error.message);
  }
};

// Only sales with proof of a Syncstock click count — see
// attribution.service.js. The web pixel may report the same order too;
// whichever arrives second completes the match.
const handleOrderCreate = async (req, res) => {
  try {
    const store = req.store;
    const order = JSON.parse(req.body);
    res.status(200).json({ received: true });

    await attributeOrder(store, order);
  } catch (error) {
    console.error("Order create webhook error:", error.message);
  }
};

// A product changed (products/update), or — for sales-channel stores — it
// was published to SyncStock or changed while published (product_listings
// add/update: listed = true). Saves every size, then sends restock and
// price-drop alerts for what changed.
const processProductUpdate = async (store, data, { listed = false } = {}) => {
    const variants = data.variants || [];
    const imageUrl = data.images?.[0]?.src || null;
    const category = categorizeProduct(data);
    if (!category) return; // gift cards aren't listed
    const channel = isChannelStore(store);

    // Shopify sends products/update for ANY change — a sale, a photo
    // reorder, a bulk location or tag edit. Alerts only go out for what
    // shoppers care about, so the variants are read as they were before
    // this update overwrites them.
    const before = await Inventory.findAll({
      where: { store_id: store.id, shopify_product_id: String(data.id) },
      attributes: ["shopify_variant_id", "available", "price", "image_url", "published"],
    });
    const beforeByVariant = new Map(before.map((row) => [row.shopify_variant_id, row]));

    // Live for shoppers? The Lab: on its Online Store. Sales-channel
    // stores: published to SyncStock (this listing webhook, or already)
    const isPublished = channel ? listed || before.some((row) => row.published === true) : !!data.published_at;
    const hasImage = !!imageUrl;

    // Automatic publishing (if on): bring SyncStock in line with this
    // change — e.g. Copyt just put it live on the Online Store
    if (channel && !listed) await autoPublish.applyToProduct(store, data, isPublished);

    const restockVariants = [];
    const priceDropVariants = [];

    for (const variant of variants) {
      const { size, condition, boxCondition } = readVariant(data, variant, category);

      const newPrice = parseFloat(variant.price) || null;
      const compareAtPrice = parseFloat(variant.compare_at_price) || null;
      const isPriceDrop =
        compareAtPrice && newPrice && newPrice < compareAtPrice;

      // Alert-worthy: the variant just went live (published with a photo,
      // or is new to SyncStock), or it was sold out and is back. A price
      // drop counts only when the price actually went down in this update.
      const prior = beforeByVariant.get(String(variant.id));
      const wasLive = channel
        ? !!prior && prior.published === true && !!prior.image_url
        : !!prior && prior.published !== false && !!prior.image_url;
      const wasInStock = !!prior && prior.available > 0;
      if (variant.inventory_quantity > 0) {
        if (!wasLive || !wasInStock) {
          restockVariants.push(variant);
        } else if (
          isPriceDrop &&
          prior.price != null &&
          newPrice < parseFloat(prior.price)
        ) {
          priceDropVariants.push(variant);
        }
      }

      await Inventory.upsert({
        store_id: store.id,
        shopify_product_id: String(data.id),
        shopify_variant_id: String(variant.id),
        category,
        product_name: data.title,
        brand: detectBrand(data.title, data.vendor, store.name),
        sku: variant.sku || null,
        size: normalizeSize(size, category),
        condition: condition,
        box_status: boxCondition,
        price: newPrice,
        compare_at_price: compareAtPrice || null,
        // A listing payload without stock counts leaves them as they are
        ...(variant.inventory_quantity !== undefined || !listed ? { available: variant.inventory_quantity || 0 } : {}),
        shopify_url: `${store.storefront_url}/products/${data.handle}`,
        image_url: imageUrl,
        image_urls: (data.images || []).map((img) => img.src),
        // Sales-channel stores: only a listing webhook marks it published
        ...(channel ? (listed ? { published: true } : {}) : { published: isPublished }),
        description: descriptionFromHtml(data.body_html),
        last_synced_at: new Date(),
      });
    }

    if (!isPublished || !hasImage) {
      console.log(
        `Skipping alert check — ${data.title} not ready yet (published: ${isPublished}, image: ${hasImage}) (store ${store.id})`,
      );
      return;
    }

    const notifiedUsers = new Set();

    for (const variant of restockVariants) {
      const inventoryItem = await Inventory.findOne({
        where: { store_id: store.id, shopify_variant_id: String(variant.id) },
      });
      if (inventoryItem) {
        await checkAlertsForInventory(store, inventoryItem, notifiedUsers);
      }
    }

    for (const variant of priceDropVariants) {
      const inventoryItem = await Inventory.findOne({
        where: { store_id: store.id, shopify_variant_id: String(variant.id) },
      });
      if (inventoryItem) {
        await checkPriceDropAlerts(store, inventoryItem, notifiedUsers);
      }
    }
};

const handleProductUpdate = async (req, res) => {
  res.status(200).json({ received: true });
  try {
    await processProductUpdate(req.store, JSON.parse(req.body));
  } catch (error) {
    console.error("Product update webhook error:", error.message);
  }
};

// product_listings/add and /update (sales-channel stores): the product is
// published to SyncStock — saved as published, with alerts if it just went
// live. The payload is the product under product_listing, keyed product_id.
const handleListingAddOrUpdate = async (req, res) => {
  res.status(200).json({ received: true });
  try {
    if (!isChannelStore(req.store)) return;
    const listing = JSON.parse(req.body).product_listing;
    if (!listing?.product_id) return;
    const product = { ...listing, id: listing.product_id };
    await processProductUpdate(req.store, product, { listed: true });
    // Tell the merchant in Shopify whether SyncStock can show it
    await sendProductFeedback(req.store, product);
  } catch (error) {
    console.error("Product listing webhook error:", error.message);
  }
};

// product_listings/remove: unpublished from SyncStock — hidden from
// shoppers (kept, so publishing again restores it)
const handleListingRemove = async (req, res) => {
  res.status(200).json({ received: true });
  try {
    if (!isChannelStore(req.store)) return;
    const productId = JSON.parse(req.body).product_listing?.product_id;
    if (!productId) return;
    await Inventory.update(
      { published: false, last_synced_at: new Date() },
      { where: { store_id: req.store.id, shopify_product_id: String(productId) } },
    );
  } catch (error) {
    console.error("Product listing remove webhook error:", error.message);
  }
};

// orders/cancelled and refunds/create: the order's sales are re-read from
// Shopify and set to what's been refunded (attribution.service.js), so
// revenue stays net of returns. Orders SyncStock never credited are skipped.
const handleOrderCancelled = async (req, res) => {
  try {
    const order = JSON.parse(req.body);
    res.status(200).json({ received: true });
    await refreshOrderRefunds(req.store, order.id);
  } catch (error) {
    console.error("Order cancelled webhook error:", error.message);
  }
};

const handleRefundCreate = async (req, res) => {
  try {
    const refund = JSON.parse(req.body);
    res.status(200).json({ received: true });
    await refreshOrderRefunds(req.store, refund.order_id);
  } catch (error) {
    console.error("Refund webhook error:", error.message);
  }
};

module.exports = {
  handleListingAddOrUpdate,
  handleListingRemove,
  handleProductCreate,
  handleProductDelete,
  handleProductUpdate,
  handleOrderCreate,
  handleOrderCancelled,
  handleRefundCreate,
};
