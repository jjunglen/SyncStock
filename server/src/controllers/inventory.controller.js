const { Op } = require("sequelize");
const { Inventory } = require("../models/index.js");
const { getPagination, buildMeta, DEFAULT_LIMIT } = require("../utils/pagination.js");

// GET /api/inventory?page=1&limit=20 — available items for the current store
const getInventory = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const { count, rows } = await Inventory.findAndCountAll({
      where: { store_id: req.store.id, available: { [Op.gt]: 0 } },
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

// GET /api/inventory/search?q=jordan&size=10M/11.5W&max_price=300&page=1&limit=20
const searchInventory = async (req, res) => {
  try {
    const { q, size, min_price, max_price } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    const where = { store_id: req.store.id, available: { [Op.gt]: 0 } };

    if (q) {
      where[Op.or] = [
        { shoe_name: { [Op.iLike]: `%${q}%` } },
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

// GET /api/inventory/my-sizes?page=1&limit=20 — items in the logged-in
// account's saved sizes, for the current store
const getInventoryInMySizes = async (req, res) => {
  try {
    if (!req.account) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const sizes = req.account.sizes;

    if (!sizes || sizes.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        meta: buildMeta(0, 1, DEFAULT_LIMIT),
        message:
          "No saved sizes yet — add sizes to your account to see matches",
      });
    }

    const { page, limit, offset } = getPagination(req.query);

    const { count, rows } = await Inventory.findAndCountAll({
      where: {
        store_id: req.store.id,
        available: { [Op.gt]: 0 },
        size: { [Op.in]: sizes },
      },
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

module.exports = {
  getInventory,
  getInventoryItem,
  searchInventory,
  getInventoryInMySizes,
};
