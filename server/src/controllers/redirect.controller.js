const {
  AlertClick,
  Inventory,
  NotificationLog,
  Store,
  User,
} = require("../models/index.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");
const { CLICK_ATTRIBUTE, UUID_RE } = require("../services/attribution.service.js");

// Most items one Syncstock cart can hand to Shopify at once
const MAX_CART_ITEMS = 10;

const trackRedirect = async (req, res) => {
  try {
    const { alert_id, inventory_id, notification_id } = req.query;

    if (!inventory_id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing inventory_id" });
    }

    const item = await Inventory.findByPk(inventory_id);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    const store = await Store.findByPk(item.store_id);
    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    }

    let membership = null;
    if (req.account) {
      membership = await User.findOne({
        where: { account_id: req.account.id, store_id: store.id },
      });
    }

    if (item.available < 1) {
      return res.redirect(
        `${storeBaseUrl(store)}/store/dashboard?tab=browse`,
      );
    }

    const click = await AlertClick.create({
      store_id: store.id,
      user_id: membership?.id || null,
      alert_id: alert_id && alert_id !== "null" ? alert_id : null,
      notification_id: notification_id || null,
      inventory_id: item.id,
      shopify_variant_id: item.shopify_variant_id,
      channel: "buy_now",
      product_name: item.product_name,
      sku: item.sku || null,
      size: item.size || null,
      clicked_at: new Date(),
    });

    if (notification_id) {
      await NotificationLog.update(
        { read: true },
        { where: { id: notification_id, store_id: store.id } },
      );
    }

    // Shopify cart link: puts the item in the store's cart with our click
    // tag attached, then opens the cart page (storefront=true) rather than
    // checkout. The tag stays on that cart while the shopper keeps
    // browsing the store, so the sale still counts if they check out
    // later (attribution.service.js); the web pixel also picks it up here.
    const cartUrl = `${store.storefront_url}/cart/${item.shopify_variant_id}:1?storefront=true&attributes[${CLICK_ATTRIBUTE}]=${click.id}`;

    return res.redirect(cartUrl);
  } catch (error) {
    console.error("Track redirect error:", error.message);
    return res.status(500).json({ success: false, message: "Redirect failed" });
  }
};

// POST /api/redirect/cart  { inventory_ids: [...] }
// Multi-item checkout. Rechecks stock first: if anything sold out, it
// says which (no link) so the shopper can see what changed. Otherwise
// it logs one click per item and returns a single Shopify cart link with
// every item, each click as its own tag (syncstock_click_id,
// syncstock_click_id_2, …) — so each item counts as a sale on its own.
const createCartCheckout = async (req, res) => {
  try {
    const ids = [...new Set(Array.isArray(req.body?.inventory_ids) ? req.body.inventory_ids : [])]
      .map(String)
      .filter((id) => UUID_RE.test(id));
    if (ids.length === 0 || ids.length > MAX_CART_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `Add between 1 and ${MAX_CART_ITEMS} items to check out`,
      });
    }

    const store = req.store;
    const items = await Inventory.findAll({ where: { id: ids, store_id: store.id } });
    const found = new Set(items.map((item) => item.id));
    const unavailable = [
      ...ids.filter((id) => !found.has(id)),
      ...items.filter((item) => item.available < 1).map((item) => item.id),
    ];
    if (unavailable.length > 0) {
      return res.status(200).json({ success: true, data: { url: null, unavailable } });
    }

    const membership = await User.findOne({
      where: { account_id: req.account.id, store_id: store.id },
    });
    // Keep the shopper's cart order
    const ordered = ids.map((id) => items.find((item) => item.id === id));
    const clicks = await AlertClick.bulkCreate(
      ordered.map((item) => ({
        store_id: store.id,
        user_id: membership?.id || null,
        inventory_id: item.id,
        shopify_variant_id: item.shopify_variant_id,
        channel: "cart",
        product_name: item.product_name,
        sku: item.sku || null,
        size: item.size || null,
        clicked_at: new Date(),
      })),
    );

    const lines = ordered.map((item) => `${item.shopify_variant_id}:1`).join(",");
    const tags = clicks
      .map((click, i) => `attributes[${CLICK_ATTRIBUTE}${i === 0 ? "" : `_${i + 1}`}]=${click.id}`)
      .join("&");
    const url = `${store.storefront_url}/cart/${lines}?storefront=true&${tags}`;

    return res.status(200).json({ success: true, data: { url, unavailable: [] } });
  } catch (error) {
    console.error("Cart checkout error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't start checkout" });
  }
};

module.exports = { trackRedirect, createCartCheckout };
