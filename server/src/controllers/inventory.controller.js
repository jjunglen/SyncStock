const { Op, fn, col } = require("sequelize");
const { Inventory } = require("../models/index.js");
const { getPagination, buildMeta, DEFAULT_LIMIT } = require("../utils/pagination.js");

// Must match the Inventory.category ENUM — anything else makes Postgres throw
const CATEGORIES = Inventory.getAttributes().category.values;
// Listed items must be in stock and have a photo — Shopify products
// with no images (merch, books) would show as empty cards
const listable = (storeId) => ({
  store_id: storeId,
  available: { [Op.gt]: 0 },
  image_url: { [Op.ne]: null },
});

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
      where: listable(req.store.id),
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

// GET /api/inventory/search?q=jordan&size=10M/11.5W&category=sneakers&max_price=300&page=1&limit=20
const searchInventory = async (req, res) => {
  try {
    const { q, size, category, min_price, max_price } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    const where = listable(req.store.id);

    if (category) {
      if (!CATEGORIES.includes(category)) return invalidCategory(res);
      where.category = category;
    }

    if (q) {
      where[Op.or] = [
        { product_name: { [Op.iLike]: `%${q}%` } },
        { sku: { [Op.iLike]: `%${q}%` } },
      ];
    }

    if (size) {
      where.size = size;
    }

    if (min_price) {
      where.price = { ...where.price, [Op.gte]: min_price };
    }

    if (max_price) {
      where.price = { ...where.price, [Op.lte]: max_price };
    }

    const { count, rows } = await Inventory.findAndCountAll({
      where,
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
    console.error("Search inventory error:", error.message);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};

// GET /api/inventory/my-sizes?category=sneakers&page=1&limit=20
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

    const where = listable(req.store.id);
    if (!sizeless) where.size = { [Op.in]: sizes };
    if (category) where.category = category;

    const { count, rows } = await Inventory.findAndCountAll({
      where,
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
      where: listable(req.store.id),
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

module.exports = {
  getCategories,
  getInventory,
  getInventoryItem,
  searchInventory,
  getInventoryInMySizes,
};
