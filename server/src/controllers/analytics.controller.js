const { sequelize } = require("../config/database.js");
const { QueryTypes, Op } = require("sequelize");
const { Purchase, User, Account } = require("../models/index.js");
const { getPagination, buildMeta } = require("../utils/pagination.js");
const { WEBSITE_SOURCES, IN_STORE_SOURCE } = require("../utils/signupSource.js");

const getSourcingDemand = async (req, res) => {
  try {
    const results = await sequelize.query(
      `
      SELECT
        COALESCE(a.stockx_product_id, LOWER(a.product_name)) AS product_key,
        a.product_name,
        a.size,
        COUNT(DISTINCT a.user_id)::int AS demand_count,
        -- In stock = the same item in the same size has stock. One-size
        -- items have no size on either side (IS NOT DISTINCT FROM treats
        -- two empty sizes as the same; = never does). Same item: the
        -- same name (as alerts match), or the same SKU.
        BOOL_OR(EXISTS (
          SELECT 1 FROM inventory i
          WHERE i.store_id = :storeId
            AND i.available > 0
            AND i.size IS NOT DISTINCT FROM a.size
            AND (
              LOWER(i.product_name) = LOWER(a.product_name)
              OR (a.sku IS NOT NULL AND a.sku <> '' AND UPPER(i.sku) = UPPER(a.sku))
            )
        )) AS currently_in_stock
      FROM alerts a
      WHERE a.store_id = :storeId AND a.active = true
      GROUP BY product_key, a.product_name, a.size
      -- Every tracked item: the Sourcing page lists them all, the
      -- dashboard shows the top 8 and counts the rest
      ORDER BY demand_count DESC, a.product_name, a.size
      `,
      { replacements: { storeId: req.store.id }, type: QueryTypes.SELECT }
    );

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Get sourcing demand error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch sourcing demand" });
  }
};

// Revenue SyncStock drove: exact sales (the size clicked was bought), net
// of refunds and cancellations. "Assisted" sales (another size of a
// clicked product) and refunds are reported alongside, never mixed in.
const getRevenue = async (req, res) => {
  try {
    const [r] = await sequelize.query(
      `
      SELECT
        COALESCE(SUM(price_paid - refunded_amount) FILTER (WHERE match_type = 'exact'), 0)::float AS total_revenue,
        COUNT(*) FILTER (WHERE match_type = 'exact' AND refunded_amount < price_paid)::int AS purchase_count,
        COALESCE(SUM(price_paid - refunded_amount) FILTER (WHERE match_type = 'product'), 0)::float AS assisted_revenue,
        COUNT(*) FILTER (WHERE match_type = 'product' AND refunded_amount < price_paid)::int AS assisted_count,
        COALESCE(SUM(refunded_amount), 0)::float AS refunded_total
      FROM purchases
      WHERE store_id = :storeId
      `,
      { replacements: { storeId: req.store.id }, type: QueryTypes.SELECT },
    );

    return res.status(200).json({ success: true, data: r });
  } catch (error) {
    console.error("Get revenue error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch revenue" });
  }
};

// The notification funnel counts SHOPPERS, and each step only counts
// shoppers from the step before, so it always narrows:
//   tracking  — set an alert
//   notified  — …and got a restock notification (sent, not just queued)
//   clicked   — …and tapped Buy now after it
//   purchased — …and bought the exact item (not fully refunded)
// notifications_sent: every notification that went out (the stat card)
const FUNNEL_SQL = `
  WITH tracking AS (
    SELECT DISTINCT user_id FROM alerts WHERE store_id = :storeId AND user_id IS NOT NULL
  ),
  notified AS (
    SELECT t.user_id, MIN(p.created_at) AS first_at
    FROM tracking t
    JOIN pending_notifications p ON p.user_id = t.user_id AND p.store_id = :storeId AND p.sent = true
    GROUP BY t.user_id
  ),
  clicked AS (
    SELECT DISTINCT n.user_id
    FROM notified n
    JOIN alert_clicks c ON c.user_id = n.user_id AND c.store_id = :storeId AND c.clicked_at >= n.first_at
  ),
  bought AS (
    SELECT DISTINCT k.user_id
    FROM clicked k
    JOIN purchases p ON p.user_id = k.user_id AND p.store_id = :storeId
      AND p.match_type = 'exact' AND p.refunded_amount < p.price_paid
  )
  SELECT
    (SELECT COUNT(*) FROM tracking)::int AS tracking,
    (SELECT COUNT(*) FROM notified)::int AS notified,
    (SELECT COUNT(*) FROM clicked)::int AS clicked,
    (SELECT COUNT(*) FROM bought)::int AS purchased,
    (SELECT COUNT(*) FROM pending_notifications WHERE store_id = :storeId AND sent = true)::int AS notifications_sent
`;

const getFunnel = async (req, res) => {
  try {
    const [data] = await sequelize.query(FUNNEL_SQL, {
      replacements: { storeId: req.store.id },
      type: QueryTypes.SELECT,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get funnel error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch funnel" });
  }
};

const getCustomerCount = async (req, res) => {
  try {
    const [count, fromWebsite, inStore] = await Promise.all([
      User.count({ where: { store_id: req.store.id } }),
      User.count({ where: { store_id: req.store.id, signup_source: WEBSITE_SOURCES } }),
      User.count({ where: { store_id: req.store.id, signup_source: IN_STORE_SOURCE } }),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        count,
        from_website: fromWebsite,
        website_clicks: req.store.widget_clicks || 0,
        in_store: inStore,
      },
    });
  } catch (error) {
    console.error("Get customer count error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch customer count" });
  }
};

// Purchases are grouped by month in the store's time zone (the same one
// the daily jobs use), so a late-night order lands in the right month
const STORE_TIME_ZONE = "America/Chicago";

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

    // Totals for every month (not just this page), in the store's time
    // zone: sales, and revenue the way the dashboard counts it — exact
    // size matches, after refunds, cancelled orders left out
    const months = await sequelize.query(
      `
      SELECT
        to_char(date_trunc('month', purchased_at AT TIME ZONE :tz), 'YYYY-MM') AS month,
        COUNT(*)::int AS sales,
        COUNT(*) FILTER (WHERE match_type = 'product')::int AS assisted,
        COALESCE(SUM(GREATEST(price_paid - refunded_amount, 0)) FILTER (WHERE match_type = 'exact' AND cancelled_at IS NULL), 0)::float AS revenue
      FROM purchases
      WHERE store_id = :storeId
      GROUP BY 1
      ORDER BY 1 DESC
      `,
      { replacements: { storeId: req.store.id, tz: STORE_TIME_ZONE }, type: QueryTypes.SELECT },
    );
    const monthOf = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE, year: "numeric", month: "2-digit" });

    return res.status(200).json({
      success: true,
      data: rows.map((row) => {
        const { User: buyer, ...purchase } = row.toJSON();
        return {
          ...purchase,
          customer_email: purchase.customer_email || buyer?.Account?.email || null,
          month: monthOf.format(new Date(purchase.purchased_at)).slice(0, 7),
        };
      }),
      months,
      meta: buildMeta(count, page, limit),
    });
  } catch (error) {
    console.error("Get purchases error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch purchases" });
  }
};

// GET /api/analytics/most-viewed — the products shoppers opened most in
// the last 7 days (each shopper counted once per product, any size), with
// whether any size is in stock. For the merchant only.
const getMostViewed = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `
      SELECT
        pv.shopify_product_id,
        COUNT(DISTINCT pv.account_id)::int AS viewers,
        MAX(i.product_name) AS product_name,
        MAX(i.image_url) AS image_url,
        BOOL_OR(i.available > 0) AS in_stock
      FROM product_views pv
      JOIN inventory i
        ON i.store_id = pv.store_id AND i.shopify_product_id = pv.shopify_product_id
      WHERE pv.store_id = :storeId
        AND pv.viewed_at >= NOW() - INTERVAL '7 days'
      GROUP BY pv.shopify_product_id
      ORDER BY viewers DESC, MAX(pv.viewed_at) DESC
      LIMIT 8
      `,
      { replacements: { storeId: req.store.id }, type: QueryTypes.SELECT },
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Get most viewed error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch most viewed" });
  }
};

module.exports = { getSourcingDemand, getRevenue, getFunnel, getCustomerCount, getPurchases, getMostViewed };
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
