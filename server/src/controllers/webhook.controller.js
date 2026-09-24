const {
  Inventory,
  Alert,
  User,
  Purchase,
  AlertClick,
} = require("../models/index.js");
const { parseVariantTitle } = require("../utils/parseVariantTitle.js");
const {
  checkAlertsForInventory,
  checkPriceDropAlerts,
} = require("../services/alert.service.js");
const { Op } = require("sequelize");

const isItemMatch = (source, item) => {
  const skuMatch =
    source.sku &&
    item.sku &&
    source.sku.toLowerCase() === item.sku.toLowerCase();
  if (skuMatch) return true;
  if (!source.product_name) return false;
  const sourceWords = source.product_name.toLowerCase().split(" ");
  const itemName = (item.title || "").toLowerCase();
  return sourceWords.every((word) => itemName.includes(word));
};

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
        category: "sneakers",
        product_name: data.title,
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

    const clickAttr = (data.note_attributes || []).find(
      (attr) => attr.name === "syncstock_click_id",
    );

    if (clickAttr) {
      const click = await AlertClick.findOne({
        where: { id: clickAttr.value, store_id: store.id },
      });

      if (click) {
        const matchedItem =
          lineItems.find(
            (item) =>
              click.sku &&
              item.sku &&
              item.sku.toLowerCase() === click.sku.toLowerCase(),
          ) ||
          lineItems.find((item) =>
            (item.title || "")
              .toLowerCase()
              .includes((click.product_name || "").toLowerCase()),
          );

        if (matchedItem) {
          await Purchase.create({
            store_id: store.id,
            user_id: click.user_id,
            alert_id: click.alert_id,
            shopify_order_id: shopifyOrderId,
            category: "sneakers",
            product_name: click.product_name,
            sku: click.sku,
            size: click.size,
            price_paid: parseFloat(matchedItem.price) || null,
            customer_email: customerEmail,
            purchased_at: new Date(data.created_at),
          });
          console.log(
            `Purchase attributed via click tag — ${click.product_name} for ${customerEmail} (store ${store.id})`,
          );
          return;
        }
      }
    }

    if (!customerEmail) return;

    const user = await User.findOne({
      where: { store_id: store.id, email: customerEmail },
    });
    if (!user) return;

    const ATTRIBUTION_WINDOW_DAYS = 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ATTRIBUTION_WINDOW_DAYS);

    const userAlerts = await Alert.findAll({
      where: {
        store_id: store.id,
        user_id: user.id,
        created_at: { [Op.gte]: cutoff },
      },
    });
    const recentClicks = await AlertClick.findAll({
      where: {
        store_id: store.id,
        user_id: user.id,
        clicked_at: { [Op.gte]: cutoff },
      },
    });

    for (const item of lineItems) {
      const matchedAlert = userAlerts.find((alert) => isItemMatch(alert, item));
      const matchedClick = recentClicks.find((click) =>
        isItemMatch(click, item),
      );

      if (!matchedAlert && !matchedClick) {
        continue;
      }

      await Purchase.create({
        store_id: store.id,
        user_id: user.id,
        alert_id: matchedAlert?.id || null,
        shopify_order_id: shopifyOrderId,
        category: "sneakers",
        product_name: item.title,
        sku: item.sku || null,
        size: item.variant_title?.split(" - ")?.[0] || null,
        price_paid: parseFloat(item.price) || null,
        customer_email: customerEmail,
        purchased_at: new Date(data.created_at),
      });

      console.log(
        `Purchase attributed via matching — ${item.title} for ${customerEmail} (store ${store.id})`,
      );
    }
  } catch (error) {
    console.error("Order create webhook error:", error.message);
  }
};

const handleProductUpdate = async (req, res) => {
  try {
    const store = req.store;
    const data = JSON.parse(req.body);
    
    // TEMPORARY — remove once this is diagnosed
    console.log("RAW WEBHOOK DATA:", JSON.stringify({
      title: data.title,
      published_at: data.published_at,
      status: data.status,
      images: data.images,
    }, null, 2));
    
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
        category: "sneakers",
        product_name: data.title,
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
