const { sequelize } = require("../config/database.js");
const { QueryTypes } = require("sequelize");
const { Alert, NotificationLog, AlertClick, Purchase, User } = require("../models/index.js");
const { getPagination, buildMeta } = require("../utils/pagination.js");

const getSourcingDemand = async (req, res) => {
  try {
    const results = await sequelize.query(
      `
      SELECT
        COALESCE(a.stockx_product_id, LOWER(a.product_name)) AS product_key,
        a.product_name,
        a.size,
        COUNT(DISTINCT a.user_id)::int AS demand_count,
        EXISTS (
          SELECT 1 FROM inventory i
          WHERE i.store_id = :storeId
            AND i.available > 0
            AND i.size = a.size
            AND LOWER(i.product_name) LIKE '%' || LOWER(SPLIT_PART(a.product_name, ' ', 1)) || '%'
        ) AS currently_in_stock
      FROM alerts a
      WHERE a.store_id = :storeId AND a.active = true
      GROUP BY product_key, a.product_name, a.size
      ORDER BY demand_count DESC
      LIMIT 20
      `,
      { replacements: { storeId: req.store.id }, type: QueryTypes.SELECT }
    );

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Get sourcing demand error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch sourcing demand" });
  }
};

const getRevenue = async (req, res) => {
  try {
    const result = await Purchase.findOne({
      where: { store_id: req.store.id },
      attributes: [
        [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("price_paid")), 0), "total_revenue"],
        [sequelize.fn("COUNT", sequelize.col("id")), "purchase_count"],
      ],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        total_revenue: parseFloat(result.total_revenue),
        purchase_count: parseInt(result.purchase_count, 10),
      },
    });
  } catch (error) {
    console.error("Get revenue error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch revenue" });
  }
};

const getFunnel = async (req, res) => {
  try {
    const storeId = req.store.id;

    const [alerts, notified, clicked, purchased] = await Promise.all([
      Alert.count({ where: { store_id: storeId, active: true } }),
      NotificationLog.count({ where: { store_id: storeId } }),
      AlertClick.count({ where: { store_id: storeId } }),
      Purchase.count({ where: { store_id: storeId } }),
    ]);

    return res.status(200).json({
      success: true,
      data: { alerts, notified, clicked, purchased },
    });
  } catch (error) {
    console.error("Get funnel error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch funnel" });
  }
};

const getCustomerCount = async (req, res) => {
  try {
    const count = await User.count({ where: { store_id: req.store.id } });
    return res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    console.error("Get customer count error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch customer count" });
  }
};

const getPurchases = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);

    const { count, rows } = await Purchase.findAndCountAll({
      where: { store_id: req.store.id },
      order: [["purchased_at", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: buildMeta(count, page, limit),
    });
  } catch (error) {
    console.error("Get purchases error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch purchases" });
  }
};

module.exports = { getSourcingDemand, getRevenue, getFunnel, getCustomerCount, getPurchases };