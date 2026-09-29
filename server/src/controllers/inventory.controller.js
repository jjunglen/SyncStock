const { Op, fn, col } = require("sequelize");
const { Inventory } = require("../models/index.js");
const { getPagination, buildMeta, DEFAULT_LIMIT } = require("../utils/pagination.js");
const { enabledCategories } = require("../utils/storeSettings.js");

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
      where: { id: req.params.id, store_id: req.store.id },
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

// GET /api/inventory/search?q=jordan&size=10M/11.5W&category=sneakers&brand=Nike&min_price=100&max_price=300&page=1&limit=20
const searchInventory = async (req, res) => {
  try {
    const { q, size, category } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    if (category && !CATEGORIES.includes(category)) return invalidCategory(res);
    const where = listable(req.store, category);

    if (q) {
      where[Op.or] = [
        { product_name: { [Op.iLike]: `%${q}%` } },
        { sku: { [Op.iLike]: `%${q}%` } },
      ];
    }

    if (size) {
      where.size = size;
    }

    applyFilters(where, req.query);

    const { count, rows } = await Inventory.findAndCountAll({
      where,
      order: sortOrder(req.query.sort),
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: buildMeta(count, page, limit),
    });
  } catch (error) {
    console.error("Search inventory error:", error.message);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};

// The listed items in the shopper's saved sizes (trading cards: all)
const mySizesWhere = (store, sizes, category) => {
  const where = listable(store, category);
  if (category !== "trading_cards") where.size = { [Op.in]: sizes || [] };
  return where;
};

// GET /api/inventory/my-sizes?category=sneakers&brand=Nike&min_price=100&max_price=300&page=1&limit=20
const getInventoryInMySizes = async (req, res) => {
  try {
    if (!req.account) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const sizes = req.account.sizes;
    const { category } = req.query;
    if (category && !CATEGORIES.includes(category)) return invalidCategory(res);

    // Trading cards have no sizes — "in your sizes" is every listed card
    const sizeless = category === "trading_cards";

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

    const where = applyFilters(mySizesWhere(req.store, sizes, category), req.query);

    const { count, rows } = await Inventory.findAndCountAll({
      where,
      order: sortOrder(req.query.sort),
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: buildMeta(count, page, limit),
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
    const data = CATEGORIES.filter((c) => counts[c] > 0).map((c) => ({
      key: c,
      count: counts[c],
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

    const where =
      scope === "my-sizes"
        ? mySizesWhere(req.store, req.account.sizes, category)
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

module.exports = {
  getBrands,
  getProductSizes,
  getCategories,
  getInventory,
  getInventoryItem,
  searchInventory,
  getInventoryInMySizes,
};
