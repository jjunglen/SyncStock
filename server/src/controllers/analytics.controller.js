const { sequelize } = require("../config/database.js");
const { QueryTypes } = require("sequelize");
const { Alert, NotificationLog, AlertClick, Purchase, User, Account } = require("../models/index.js");
const { getPagination, buildMeta } = require("../utils/pagination.js");
const { SOURCES } = require("../utils/signupSource.js");

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
    const [count, fromWebsite] = await Promise.all([
      User.count({ where: { store_id: req.store.id } }),
      User.count({ where: { store_id: req.store.id, signup_source: SOURCES } }),
    ]);
    return res.status(200).json({
      success: true,
      data: { count, from_website: fromWebsite, website_clicks: req.store.widget_clicks || 0 },
    });
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
      // The buyer's SyncStock account — Shopify's order email isn't
      // requested (protected customer data), so this is who bought
      include: [{ model: User, attributes: ["id"], include: [{ model: Account, attributes: ["email"] }] }],
      order: [["purchased_at", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows.map((row) => {
        const { User: buyer, ...purchase } = row.toJSON();
        return { ...purchase, customer_email: purchase.customer_email || buyer?.Account?.email || null };
      }),
      meta: buildMeta(count, page, limit),
    });
  } catch (error) {
    console.error("Get purchases error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch purchases" });
  }
};

module.exports = { getSourcingDemand, getRevenue, getFunnel, getCustomerCount, getPurchases };
// --- Price check (merchant): brand-new pairs vs StockX -----------------
const { Op: PriceOp } = require("sequelize");
const {
  runPriceCheck,
  priceCheckProgress,
  isPriceCheckEnabled,
  ELIGIBLE,
} = require("../services/priceCheck.service.js");
const { Inventory, StockxPriceCheck } = require("../models/index.js");

const notEnabled = (res) =>
  res.status(403).json({ success: false, message: "Price check isn't available for this store yet" });

// Status for one pair. "below_bid" counts from $1: a StockX buyer is
// offering more than this price right now.
const priceStatus = (price, ask, bid) => {
  if (bid != null && price < bid) return "below_bid";
  if (ask != null && price > ask) return "above_ask";
  return "priced_right";
};

// GET /api/analytics/price-check
const getPriceCheck = async (req, res) => {
  try {
    if (!isPriceCheckEnabled(req.store)) return notEnabled(res);
    const pairs = await Inventory.findAll({
      where: { store_id: req.store.id, category: "sneakers", available: { [PriceOp.gt]: 0 }, ...ELIGIBLE },
      attributes: ["id", "product_name", "sku", "size", "price", "image_url", "shopify_product_id"],
      order: [["product_name", "ASC"]],
    });
    const checks = new Map(
      (await StockxPriceCheck.findAll({ where: { store_id: req.store.id } })).map((c) => [c.inventory_id, c]),
    );
    const shopHandle = req.store.shopify_domain.replace(/\.myshopify\.com$/, "");

    const rows = pairs.map((p) => {
      const c = checks.get(p.id);
      const price = Number(p.price);
      const ask = c?.lowest_ask != null ? Number(c.lowest_ask) : null;
      const bid = c?.highest_bid != null ? Number(c.highest_bid) : null;
      const own = c?.own_ask != null ? Number(c.own_ask) : null;
      const matched = c?.status === "matched" && (ask != null || bid != null);
      return {
        id: p.id,
        product_name: p.product_name,
        style_id: p.sku,
        size: p.size,
        image_url: p.image_url,
        price,
        lowest_ask: ask,
        highest_bid: bid,
        vs_ask: matched && ask != null ? Math.round(price - ask) : null,
        below_bid_by: matched && bid != null && price < bid ? Math.round(bid - price) : 0,
        own_lowest_ask: matched && own != null && ask != null && own <= ask,
        status: !c ? "not_checked" : matched ? priceStatus(price, ask, bid) : c.status,
        shopify_admin_url: `https://admin.shopify.com/store/${shopHandle}/products/${p.shopify_product_id}`,
      };
    });

    const matchedRows = rows.filter((r) => ["below_bid", "above_ask", "priced_right"].includes(r.status));
    const checkedAt = [...checks.values()].map((c) => c.checked_at).filter(Boolean).sort().pop() || null;
    return res.status(200).json({
      success: true,
      data: {
        rows,
        summary: {
          pairs: rows.length,
          compared: matchedRows.length,
          below_bid: matchedRows.filter((r) => r.status === "below_bid").length,
          above_ask: matchedRows.filter((r) => r.status === "above_ask").length,
          own_lowest_ask: matchedRows.filter((r) => r.own_lowest_ask).length,
          money_left: matchedRows.reduce((sum, r) => sum + r.below_bid_by, 0),
        },
        checked_at: checkedAt,
        progress: priceCheckProgress(req.store),
      },
    });
  } catch (error) {
    console.error("Get price check error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load price check" });
  }
};

// POST /api/analytics/price-check/refresh — starts a check in the
// background (a few minutes); the page polls getPriceCheck for progress
const refreshPriceCheck = async (req, res) => {
  if (!isPriceCheckEnabled(req.store)) return notEnabled(res);
  if (!priceCheckProgress(req.store)?.running) {
    runPriceCheck(req.store).catch((err) => console.error("Price check error:", err.message));
  }
  return res.status(202).json({ success: true, data: { progress: priceCheckProgress(req.store) } });
};

module.exports.getPriceCheck = getPriceCheck;
module.exports.refreshPriceCheck = refreshPriceCheck;
