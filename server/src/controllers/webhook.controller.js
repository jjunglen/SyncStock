const { Inventory, Alert, User, Purchase } = require("../models/index.js");
const { parseVariantTitle } = require("../utils/parseVariantTitle.js");
const {
  checkAlertsForInventory,
  checkPriceDropAlerts,
} = require("../services/alert.service.js");
const { Op } = require("sequelize");

const handleProductCreate = async (req, res) => {
  try {
    const store = req.store;
    const data = JSON.parse(req.body);
    const variants = data.variants || [];

    for (const variant of variants) {
      const { size, condition, boxCondition } = parseVariantTitle(
        variant.title,
        data.handle,
      );

      await Inventory.upsert({
        store_id: store.id,
        shopify_product_id: String(data.id),
        shopify_variant_id: String(variant.id),
        shoe_name: data.title,
        sku: variant.sku || null,
        size: size,
        condition: condition,
        box_status: boxCondition,
        price: parseFloat(variant.price) || null,
        available: variant.inventory_quantity || 0,
        shopify_url: `${store.storefront_url}/products/${data.handle}`,
        image_url: data.images?.[0]?.src || null,
        last_synced_at: new Date(),
      });
    }

    res.status(200).json({ received: true });

    // Only notify once the listing is actually ready
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

const handleOrderCreate = async (req, res) => {
  try {
    const store = req.store;
    const data = JSON.parse(req.body);
    res.status(200).json({ received: true });

    const customerEmail = data.email;
    const shopifyOrderId = String(data.id);
    const lineItems = data.line_items || [];

    if (!customerEmail) return;

    const tags = (data.tags || "").toLowerCase();
    const sourceName = (data.source_name || "").toLowerCase();
    if (
      sourceName === "pos" ||
      tags.includes("store-owned") ||
      tags.includes("pos")
    ) {
      console.log(`Skipping POS/store orders for ${customerEmail}`);
      return;
    }

    const landingSite = data.landing_site || "";
    if (!landingSite.includes("utm_source=syncstock")) {
      console.log(`Skipping non-Syncstock order for ${customerEmail} — no UTM`);
      return;
    }

    const user = await User.findOne({
      where: { store_id: store.id, email: customerEmail },
    });

    for (const item of lineItems) {
      const shoeName = item.title;
      const sku = item.sku || null;
      const price = parseFloat(item.price) || null;

      let alert = null;
      if (user) {
        alert = await Alert.findOne({
          where: {
            store_id: store.id,
            user_id: user.id,
            shoe_name: {
              [Op.iLike]: `%${shoeName.split(" ").slice(0, 3).join(" ")}%`,
            },
            active: true,
          },
        });
      }

      await Purchase.create({
        store_id: store.id,
        user_id: user?.id || null,
        alert_id: alert?.id || null,
        shopify_order_id: shopifyOrderId,
        shoe_name: shoeName,
        sku,
        size: item.variant_title?.split(" - ")?.[0] || null,
        price_paid: price,
        customer_email: customerEmail,
        purchased_at: new Date(data.created_at),
      });

      console.log(`Purchase recorded — ${shoeName} for ${customerEmail}`);
    }
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
        shoe_name: data.title,
        sku: variant.sku || null,
        size: size,
        condition: condition,
        box_status: boxCondition,
        price: newPrice,
        compare_at_price: compareAtPrice || null,
        available: variant.inventory_quantity || 0,
        shopify_url: `${store.storefront_url}/products/${data.handle}`,
        image_url: imageUrl,
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
