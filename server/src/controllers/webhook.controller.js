const { Inventory } = require("../models/index.js");
const { parseVariantTitle } = require("../utils/parseVariantTitle.js");
const { categorizeProduct, normalizeSize } = require("../utils/categorize.js");
const {
  checkAlertsForInventory,
  checkPriceDropAlerts,
} = require("../services/alert.service.js");
const { attributeOrder } = require("../services/attribution.service.js");

const handleProductCreate = async (req, res) => {
  try {
    const store = req.store;
    const data = JSON.parse(req.body);
    const variants = data.variants || [];
    const category = categorizeProduct(data);
    if (!category) return res.status(200).json({ received: true }); // gift cards aren't listed

    for (const variant of variants) {
      const { size, condition, boxCondition } = parseVariantTitle(
        variant.title,
        data.handle,
      );

      await Inventory.upsert({
        store_id: store.id,
        shopify_product_id: String(data.id),
        shopify_variant_id: String(variant.id),
        category,
        product_name: data.title,
        sku: variant.sku || null,
        size: normalizeSize(size, category),
        condition: condition,
        box_status: boxCondition,
        price: parseFloat(variant.price) || null,
        available: variant.inventory_quantity || 0,
        shopify_url: `${store.storefront_url}/products/${data.handle}`,
        image_url: data.images?.[0]?.src || null,
        image_urls: (data.images || []).map((img) => img.src),
        last_synced_at: new Date(),
      });
    }

    res.status(200).json({ received: true });

    const isPublished = !!data.published_at;
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
  try {
    const store = req.store;
    const data = JSON.parse(req.body);

    await Inventory.update(
      { available: 0, last_synced_at: new Date() },
      { where: { store_id: store.id, shopify_product_id: String(data.id) } },
    );

    res.status(200).json({ received: true });
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

const handleProductUpdate = async (req, res) => {
  try {
    const store = req.store;
    const data = JSON.parse(req.body);
    const variants = data.variants || [];
    const imageUrl = data.images?.[0]?.src || null;
    const category = categorizeProduct(data);
    if (!category) return res.status(200).json({ received: true }); // gift cards aren't listed

    const priceDropVariants = [];

    for (const variant of variants) {
      const { size, condition, boxCondition } = parseVariantTitle(
        variant.title,
        data.handle,
      );

      const newPrice = parseFloat(variant.price) || null;
      const compareAtPrice = parseFloat(variant.compare_at_price) || null;
      const isPriceDrop =
        compareAtPrice && newPrice && newPrice < compareAtPrice;

      await Inventory.upsert({
        store_id: store.id,
        shopify_product_id: String(data.id),
        shopify_variant_id: String(variant.id),
        category,
        product_name: data.title,
        sku: variant.sku || null,
        size: normalizeSize(size, category),
        condition: condition,
        box_status: boxCondition,
        price: newPrice,
        compare_at_price: compareAtPrice || null,
        available: variant.inventory_quantity || 0,
        shopify_url: `${store.storefront_url}/products/${data.handle}`,
        image_url: imageUrl,
        image_urls: (data.images || []).map((img) => img.src),
        last_synced_at: new Date(),
      });

      if (isPriceDrop && variant.inventory_quantity > 0) {
        priceDropVariants.push({
          variant,
          size,
          condition,
          newPrice,
          compareAtPrice,
        });
      }
    }

    res.status(200).json({ received: true });

    const isPublished = !!data.published_at;
    const hasImage = !!data.images?.[0]?.src;

    if (!isPublished || !hasImage) {
      console.log(
        `Skipping alert check — ${data.title} not ready yet (published: ${isPublished}, image: ${hasImage}) (store ${store.id})`,
      );
      return;
    }

    const notifiedUsers = new Set();

    for (const variant of variants) {
      if (!variant.inventory_quantity || variant.inventory_quantity < 1)
        continue;
      const inventoryItem = await Inventory.findOne({
        where: { store_id: store.id, shopify_variant_id: String(variant.id) },
      });
      if (inventoryItem) {
        await checkAlertsForInventory(store, inventoryItem, notifiedUsers);
      }
    }

    if (priceDropVariants.length > 0) {
      for (const { variant } of priceDropVariants) {
        const inventoryItem = await Inventory.findOne({
          where: { store_id: store.id, shopify_variant_id: String(variant.id) },
        });
        if (inventoryItem) {
          await checkPriceDropAlerts(store, inventoryItem, notifiedUsers);
        }
      }
    }
  } catch (error) {
    console.error("Product update webhook error:", error.message);
  }
};

module.exports = {
  handleProductCreate,
  handleProductDelete,
  handleProductUpdate,
  handleOrderCreate,
};
