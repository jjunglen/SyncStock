const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const { PLAN } = require("../services/billing.service.js");
const { detectBrand } = require("../utils/brand.js");

// SyncStock's own admin page (requirePlatformAdmin): how every store is
// doing, and what shoppers want across all of them. Counts and product
// names only — never a shopper's name, email or order.

const RECENT_DAYS = 30;
const CATEGORIES = ["sneakers", "clothing", "trading_cards"];

const select = (sql, replacements = {}) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// GET /api/platform/overview — totals plus one row per store
const getOverview = async (req, res) => {
  try {
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
    const [stores, [shoppers]] = await Promise.all([
      select(
        `
        SELECT
          s.id, s.name, s.subdomain, s.shopify_domain, s.status, s.billing_status,
          s.plan, s.shopify_app, s.onboarding_step, s.created_at, s.uninstalled_at,
          s.billing_started_at, s.widget_clicks,
          (SELECT COUNT(*) FROM users u WHERE u.store_id = s.id AND u.role = 'user')::int AS customers,
          (SELECT COUNT(*) FROM users u WHERE u.store_id = s.id AND u.role = 'user' AND u.created_at >= :since)::int AS new_customers,
          (SELECT COUNT(*) FROM alerts a WHERE a.store_id = s.id AND a.active = true)::int AS active_alerts,
          (SELECT COUNT(*) FROM notification_logs n WHERE n.store_id = s.id AND n.sent_at >= :since)::int AS notified,
          (SELECT COUNT(*) FROM alert_clicks c WHERE c.store_id = s.id AND c.clicked_at >= :since)::int AS clicks,
          (SELECT COUNT(*) FROM purchases p WHERE p.store_id = s.id AND p.match_type = 'exact' AND p.refunded_amount < p.price_paid)::int AS purchases,
          (SELECT COALESCE(SUM(p.price_paid - p.refunded_amount), 0) FROM purchases p WHERE p.store_id = s.id AND p.match_type = 'exact')::float AS revenue,
          (SELECT COUNT(*) FROM purchases p WHERE p.store_id = s.id AND p.match_type = 'exact' AND p.refunded_amount < p.price_paid AND p.purchased_at >= :since)::int AS recent_purchases,
          (SELECT COALESCE(SUM(p.price_paid - p.refunded_amount), 0) FROM purchases p WHERE p.store_id = s.id AND p.match_type = 'exact' AND p.purchased_at >= :since)::float AS recent_revenue,
          (SELECT MAX(p.purchased_at) FROM purchases p WHERE p.store_id = s.id) AS last_purchase_at,
          (SELECT COUNT(*) FROM inventory i WHERE i.store_id = s.id AND i.available > 0)::int AS in_stock,
          (SELECT MAX(i.last_synced_at) FROM inventory i WHERE i.store_id = s.id) AS last_synced_at
        FROM stores s
        ORDER BY revenue DESC, customers DESC
        `,
        { since },
      ),
      // People, not memberships — one shopper at two stores counts once
      select(`SELECT COUNT(DISTINCT account_id)::int AS count FROM users WHERE role = 'user'`),
    ]);

    const paying = stores.filter((s) => s.billing_status === "active" && s.plan !== "internal");
    const sum = (key) => stores.reduce((total, s) => total + (s[key] || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        recent_days: RECENT_DAYS,
        totals: {
          stores: stores.length,
          live: stores.filter((s) => s.status === "active").length,
          onboarding: stores.filter((s) => s.onboarding_step !== "complete" && !s.uninstalled_at).length,
          uninstalled: stores.filter((s) => s.uninstalled_at).length,
          paying: paying.length,
          // At today's price; stores that subscribed earlier keep theirs
          mrr: paying.length * PLAN.price,
          shoppers: shoppers.count,
          new_shoppers: sum("new_customers"),
          active_alerts: sum("active_alerts"),
          notified: sum("notified"),
          clicks: sum("clicks"),
          purchases: sum("purchases"),
          revenue: sum("revenue"),
          recent_purchases: sum("recent_purchases"),
          recent_revenue: sum("recent_revenue"),
        },
        stores,
      },
    });
  } catch (error) {
    console.error("Platform overview error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load stores" });
  }
};

// GET /api/platform/demand?category=all|sneakers|clothing|trading_cards
// What shoppers are waiting for and buying, across every store
const getDemand = async (req, res) => {
  try {
    const category = CATEGORIES.includes(req.query.category) ? req.query.category : "all";
    const replacements = { category };
    const alertFilter = `a.active = true AND (:category = 'all' OR a.category::text = :category)`;

    const [products, productSizes, sizes, brandRows, bestSellers] = await Promise.all([
      select(
        `
        SELECT
          COALESCE(a.stockx_product_id, LOWER(a.product_name)) AS product_key,
          MAX(a.product_name) AS product_name,
          MAX(a.image_url) AS image_url,
          MAX(a.category::text) AS category,
          COUNT(DISTINCT a.user_id)::int AS shoppers,
          COUNT(DISTINCT a.store_id)::int AS stores
        FROM alerts a
        WHERE ${alertFilter}
        GROUP BY product_key
        ORDER BY shoppers DESC, product_name
        LIMIT 25
        `,
        replacements,
      ),
      select(
        `
        SELECT
          COALESCE(a.stockx_product_id, LOWER(a.product_name)) AS product_key,
          a.size,
          COUNT(DISTINCT a.user_id)::int AS shoppers
        FROM alerts a
        WHERE ${alertFilter} AND a.size IS NOT NULL
        GROUP BY product_key, a.size
        `,
        replacements,
      ),
      select(
        `
        SELECT a.category::text AS category, a.size, COUNT(DISTINCT a.user_id)::int AS shoppers
        FROM alerts a
        WHERE ${alertFilter} AND a.size IS NOT NULL
        GROUP BY a.category, a.size
        ORDER BY shoppers DESC
        `,
        replacements,
      ),
      select(
        `
        SELECT a.product_name, a.user_id
        FROM alerts a
        WHERE ${alertFilter}
        `,
        replacements,
      ),
      select(
        `
        SELECT
          COALESCE(p.sku, LOWER(p.product_name)) AS product_key,
          MAX(p.product_name) AS product_name,
          MAX(p.category::text) AS category,
          COUNT(*) FILTER (WHERE p.refunded_amount < p.price_paid)::int AS purchases,
          COALESCE(SUM(p.price_paid - p.refunded_amount), 0)::float AS revenue,
          COUNT(DISTINCT p.store_id)::int AS stores
        FROM purchases p
        WHERE (:category = 'all' OR p.category::text = :category)
          AND p.match_type = 'exact'
        GROUP BY product_key
        ORDER BY purchases DESC, revenue DESC
        LIMIT 15
        `,
        replacements,
      ),
    ]);

    // Each top product's most-wanted sizes
    const sizesByProduct = new Map();
    for (const row of productSizes) {
      if (!sizesByProduct.has(row.product_key)) sizesByProduct.set(row.product_key, []);
      sizesByProduct.get(row.product_key).push({ size: row.size, shoppers: row.shoppers });
    }
    const mostWanted = products.map((p) => ({
      ...p,
      top_sizes: (sizesByProduct.get(p.product_key) || [])
        .sort((a, b) => b.shoppers - a.shoppers)
        .slice(0, 5),
    }));

    // Top sizes per category
    const sizesByCategory = {};
    for (const row of sizes) {
      const list = (sizesByCategory[row.category] ||= []);
      if (list.length < 12) list.push({ size: row.size, shoppers: row.shoppers });
    }

    // Brands, from product names (utils/brand.js) — shoppers waiting on
    // anything from that brand
    const brandShoppers = new Map();
    for (const row of brandRows) {
      const brand = detectBrand(row.product_name) || "Other";
      if (!brandShoppers.has(brand)) brandShoppers.set(brand, new Set());
      brandShoppers.get(brand).add(row.user_id);
    }
    const brands = [...brandShoppers.entries()]
      .map(([brand, users]) => ({ brand, shoppers: users.size }))
      .sort((a, b) => b.shoppers - a.shoppers)
      .slice(0, 12);

    return res.status(200).json({
      success: true,
      data: {
        category,
        most_wanted: mostWanted,
        sizes: sizesByCategory,
        brands,
        best_sellers: bestSellers,
      },
    });
  } catch (error) {
    console.error("Platform demand error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load demand" });
  }
};

module.exports = { getOverview, getDemand };
