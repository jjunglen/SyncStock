const { shopperVisible } = require("../services/channel.service.js");
const { Op, fn, col, literal } = require("sequelize");
const { Inventory, ProductView } = require("../models/index.js");
const { getPagination, buildMeta, DEFAULT_LIMIT } = require("../utils/pagination.js");
const { enabledCategories, otherCategoryName } = require("../utils/storeSettings.js");
const { sameSize, sizeMatchKey, sizeKeySql } = require("../utils/otherSizes.js");
const { otherSizeChart } = require("../services/otherSizeChart.service.js");
const { searchInventoryItems, cleanQuery } = require("../utils/inventorySearch.js");

// Must match the Inventory.category ENUM — anything else makes Postgres throw
const CATEGORIES = Inventory.getAttributes().category.values;
// Listed items must be in stock, have a photo (Shopify products with no
// images — merch, books — would show as empty cards), and be in a
// category the merchant shows (store settings). Asking for a hidden
// category finds nothing.
const listable = (store, category) => {
  const shown = enabledCategories(store);
  return {
    store_id: store.id,
    ...shopperVisible(store), // sales-channel stores: published to SyncStock only
    available: { [Op.gt]: 0 },
    image_url: { [Op.ne]: null },
    category: category
      ? shown.includes(category)
        ? category
        : { [Op.in]: [] }
      : { [Op.in]: shown },
  };
};

// Brand and price filters, shared by Browse and In stock
const isPrice = (value) => /^\d+(\.\d{1,2})?$/.test(String(value));
const applyFilters = (where, { brand, min_price, max_price }) => {
  if (brand) where.brand = String(brand);
  if (min_price && isPrice(min_price)) where.price = { ...where.price, [Op.gte]: min_price };
  if (max_price && isPrice(max_price)) where.price = { ...where.price, [Op.lte]: max_price };
  return where;
};

// ?sort= for Browse and In stock; anything else falls back to newest
const SORTS = {
  newest: [["created_at", "DESC"]],
  price_asc: [["price", "ASC NULLS LAST"], ["created_at", "DESC"]],
  price_desc: [["price", "DESC NULLS LAST"], ["created_at", "DESC"]],
};
const sortOrder = (sort) => SORTS[sort] || SORTS.newest;

const invalidCategory = (res) =>
  res.status(400).json({ success: false, message: "Invalid category" });

const PREVIEW_LIMIT = 16;

// GET /api/inventory?limit=16 — public preview for the store page. Capped
// to the first 16 items with no paging, so the full catalog is only
// browsable with an account (see /search)
const getInventory = async (req, res) => {
  try {
    const page = 1;
    const offset = 0;
    const limit = Math.min(getPagination(req.query).limit, PREVIEW_LIMIT);

    const { count, rows } = await Inventory.findAndCountAll({
      where: listable(req.store),
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: buildMeta(count, page, limit),
    });
  } catch (error) {
    console.error("Inventory retrieval error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch inventory" });
  }
};

// GET /api/inventory/:id — single item, scoped to the current store
const getInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findOne({
      where: { id: req.params.id, store_id: req.store.id, ...shopperVisible(req.store) },
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("Get inventory item error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch item" });
  }
};

// POST /api/inventory/:id/view — a shopper opened this product. Recorded
// once per shopper per product (refreshed on every look) for the
// merchant's "Most viewed this week" (analytics.controller.js). Shoppers
// never see view counts.
const recordProductView = async (req, res) => {
  try {
    const item = await Inventory.findOne({
      where: { id: req.params.id, store_id: req.store.id },
      attributes: ["shopify_product_id"],
    });
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    await ProductView.upsert(
      {
        store_id: req.store.id,
        shopify_product_id: item.shopify_product_id,
        account_id: req.account.id,
        viewed_at: new Date(),
      },
      { conflictFields: ["store_id", "shopify_product_id", "account_id"] },
    );
    return res.status(204).end();
  } catch (error) {
    console.error("Record product view error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to record view" });
  }
};

// GET /api/inventory/search?q=jordan&size=10M/11.5W,10.5M/12W&category=sneakers&brand=Nike&min_price=100&max_price=300&page=1&limit=20
const searchInventory = async (req, res) => {
  try {
    const { q, size, category } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    if (category && !CATEGORIES.includes(category)) return invalidCategory(res);
    const where = listable(req.store, category);

    // One size, or several comma-separated (sizes never contain commas)
    const sizes = [...new Set(String(size || "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 40);
    if (sizes.length === 1) where.size = sizes[0];
    else if (sizes.length > 1) where.size = { [Op.in]: sizes };

    applyFilters(where, req.query);

    // Word-by-word search, then close matches (utils/inventorySearch.js)
    const { count, rows, match } = await searchInventoryItems(Inventory, {
      where,
      q,
      order: sortOrder(req.query.sort),
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: { ...buildMeta(count, page, limit), match },
    });
  } catch (error) {
    console.error("Search inventory error:", error.message);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};

// Categories with no saved sizes to match: "in your sizes" is every
// listed item (cards have no size; "other" sizes are the store's own —
// ring 7, 158cm — not a size shoppers save)
const SIZELESS_BROWSE = ["trading_cards", "other"];

// The shopper's saved sizes that are on this store's "other" size chart
// (otherSizeChart.service.js), as match keys ("158cm" → "158")
const otherSizeKeys = (chart, sizes) =>
  [...new Set((sizes || []).filter((s) => chart.some((c) => sameSize(c, s))).map(sizeMatchKey))];

// The listed items in the shopper's saved sizes. Cards: all. Other: the
// saved sizes from the store's size chart, or everything if none saved.
//   otherChart — the store's "other" sizes (needed for category "other")
const mySizesWhere = (store, sizes, category, otherChart = []) => {
  const where = listable(store, category);
  if (category === "other") {
    const keys = otherSizeKeys(otherChart, sizes);
    if (keys.length) {
      where[Op.and] = [
        literal(`${sizeKeySql('"Inventory"."size"')} IN (${keys.map((k) => Inventory.sequelize.escape(k)).join(", ")})`),
      ];
    }
  } else if (!SIZELESS_BROWSE.includes(category)) {
    where.size = { [Op.in]: sizes || [] };
  }
  return where;
};

// GET /api/inventory/my-sizes?q=jordan&category=sneakers&brand=Nike&min_price=100&max_price=300&page=1&limit=20
const getInventoryInMySizes = async (req, res) => {
  try {
    if (!req.account) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const sizes = req.account.sizes;
    const { category } = req.query;
    if (category && !CATEGORIES.includes(category)) return invalidCategory(res);

    // Cards and "other" have no saved sizes — "in your sizes" is everything
    const sizeless = SIZELESS_BROWSE.includes(category);

    if (!sizeless && (!sizes || sizes.length === 0)) {
      return res.status(200).json({
        success: true,
        data: [],
        meta: buildMeta(0, 1, DEFAULT_LIMIT),
        message:
          "No saved sizes yet — add sizes to your account to see matches",
      });
    }

    const { page, limit, offset } = getPagination(req.query);

    const chart = category === "other" ? (await otherSizeChart(req.store)).sizes : [];
    const where = applyFilters(mySizesWhere(req.store, sizes, category, chart), req.query);

    const { count, rows, match } = await searchInventoryItems(Inventory, {
      where,
      q: req.query.q,
      order: sortOrder(req.query.sort),
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: { ...buildMeta(count, page, limit), match },
    });
  } catch (error) {
    console.error("Get inventory in my sizes error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch inventory" });
  }
};

// GET /api/inventory/categories — the categories this store has listed
// items in, in display order; the dashboard only shows tabs for these
const getCategories = async (req, res) => {
  try {
    const rows = await Inventory.findAll({
      where: listable(req.store),
      attributes: ["category", [fn("COUNT", col("id")), "count"]],
      group: ["category"],
      raw: true,
    });
    const counts = Object.fromEntries(rows.map((r) => [r.category, Number(r.count)]));
    const chart = counts.other > 0 ? await otherSizeChart(req.store) : null;
    const data = CATEGORIES.filter((c) => counts[c] > 0).map((c) => ({
      key: c,
      count: counts[c],
      // The merchant's name for "other" ("Snowboards"); null = default
      name: c === "other" ? otherCategoryName(req.store) : null,
      // "other": the store's size chart, for shoppers' saved sizes
      ...(c === "other" && { size_label: chart.label, sizes: chart.sizes }),
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get categories error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch categories" });
  }
};

// GET /api/inventory/brands?category=sneakers&scope=my-sizes — brands
// with listed items, most items first, for the Brand filter. scope
// my-sizes counts only the shopper's sizes (the In stock tab).
const getBrands = async (req, res) => {
  try {
    const { category, scope } = req.query;
    if (category && !CATEGORIES.includes(category)) return invalidCategory(res);

    const chart = scope === "my-sizes" && category === "other" ? (await otherSizeChart(req.store)).sizes : [];
    const where =
      scope === "my-sizes"
        ? mySizesWhere(req.store, req.account.sizes, category, chart)
        : listable(req.store, category);
    where.brand = { [Op.ne]: null };

    const rows = await Inventory.findAll({
      where,
      attributes: ["brand", [fn("COUNT", col("id")), "count"]],
      group: ["brand"],
      order: [[fn("COUNT", col("id")), "DESC"], ["brand", "ASC"]],
      raw: true,
    });
    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({ brand: r.brand, count: Number(r.count) })),
    });
  } catch (error) {
    console.error("Get brands error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch brands" });
  }
};

// GET /api/inventory/:id/sizes — every listed size of the same product,
// so the popup can offer "in stock in 10" or an alert for a missing size
const getProductSizes = async (req, res) => {
  try {
    const item = await Inventory.findOne({
      where: { id: req.params.id, store_id: req.store.id },
      attributes: ["shopify_product_id"],
    });
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    const rows = await Inventory.findAll({
      where: { ...listable(req.store), shopify_product_id: item.shopify_product_id },
      attributes: ["id", "size", "price", "condition"],
    });
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Get product sizes error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch sizes" });
  }
};

// Sizes in a sensible order: numbers low to high, then letters as listed
const sizeOrder = (a, b) => {
  const x = parseFloat(a);
  const y = parseFloat(b);
  if (!Number.isNaN(x) && !Number.isNaN(y)) return x - y;
  return Number.isNaN(x) - Number.isNaN(y);
};

const TRACKABLE_PRODUCTS = 10;
const TRACKABLE_ROWS = 300;

// GET /api/inventory/trackable?q=jordan — the store's own products for
// "Track a new item", one entry per product with every size it comes in.
// product_id is one of its Shopify products (createAlert reads the rest).
// Sold-out sizes are included: those are what alerts are for. Same rules
// as the shop otherwise (published, has a photo, a category the merchant
// shows), so an alert set here is one that can fire.
const getTrackableProducts = async (req, res) => {
  try {
    const q = cleanQuery(req.query.q);
    if (!q) return res.status(200).json({ success: true, data: [] });

    const { rows } = await searchInventoryItems(Inventory, {
      where: {
        store_id: req.store.id,
        ...shopperVisible(req.store),
        image_url: { [Op.ne]: null },
        category: { [Op.in]: enabledCategories(req.store) },
      },
      q,
      order: [["created_at", "DESC"]],
      limit: TRACKABLE_ROWS,
      offset: 0,
    });

    const products = new Map();
    for (const row of rows) {
      // By name: some stores (the Lab, via Copyt) list each pair as its
      // own Shopify product, and alerts match restocks by name anyway
      const key = row.product_name.trim().toLowerCase();
      if (!products.has(key)) {
        if (products.size >= TRACKABLE_PRODUCTS) continue;
        products.set(key, {
          product_id: row.shopify_product_id,
          title: row.product_name,
          sku: row.sku,
          image_url: row.image_url,
          category: row.category,
          price: row.price,
          in_stock: false,
          sizes: new Map(),
          // Trading cards: the kinds it's listed as (sealed, graded, NM…),
          // so Track only asks what applies
          card_kinds: new Set(),
        });
      }
      const product = products.get(key);
      if (row.category === "trading_cards" && row.condition) product.card_kinds.add(row.condition);
      product.sku = product.sku || row.sku;
      const inStock = Number(row.available) > 0;
      product.in_stock = product.in_stock || inStock;
      if (row.size) product.sizes.set(row.size, (product.sizes.get(row.size) || false) || inStock);
    }

    const data = [...products.values()].map((p) => ({
      ...p,
      card_kinds: [...p.card_kinds],
      sizes: [...p.sizes.entries()]
        .sort(([a], [b]) => sizeOrder(a, b))
        .map(([size, inStock]) => ({ size, in_stock: inStock })),
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Trackable products error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to search the store" });
  }
};

module.exports = {
  getTrackableProducts,
  getBrands,
  getProductSizes,
  getCategories,
  getInventory,
  getInventoryItem,
  recordProductView,
  searchInventory,
  getInventoryInMySizes,
};
