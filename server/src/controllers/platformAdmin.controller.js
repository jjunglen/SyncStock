const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const { PLAN } = require("../services/billing.service.js");
const { detectBrand } = require("../utils/brand.js");
const { Store } = require("../models/index.js");
const { isValidSubdomainFormat, subdomainTaken } = require("../utils/subdomain.js");

// SyncStock's own admin page (requirePlatformAdmin): how every store is
// doing, and what shoppers want across all of them. Counts and product
// names only — never a shopper's name, email or order.

const RECENT_DAYS = 30;
const CATEGORIES = ["sneakers", "clothing", "trading_cards", "other"];

const select = (sql, replacements = {}) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// GET /api/platform/overview — totals plus one row per store
const getOverview = async (req, res) => {
  try {
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
    const [stores, [shoppers], [emails]] = await Promise.all([
      select(
        `
        SELECT
          s.id, s.name, s.subdomain, s.shopify_domain, s.status, s.billing_status,
          s.plan, s.shopify_app, s.onboarding_step, s.created_at, s.uninstalled_at,
          s.billing_started_at, s.widget_clicks, s.former_subdomains,
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
      // Alert emails and who clicked them (alert_emails; tracked from
      // the search/visits migration on)
      select(
        `
        SELECT COUNT(*)::int AS sent,
               COUNT(*) FILTER (WHERE e.first_clicked_at IS NOT NULL)::int AS clicked,
               COUNT(DISTINCT e.account_id)::int AS people,
               COUNT(DISTINCT e.account_id) FILTER (WHERE e.first_clicked_at IS NOT NULL)::int AS people_clicked,
               COALESCE(SUM(e.clicks), 0)::int AS clicks
        FROM alert_emails e
        WHERE e.sent_at >= :since
        `,
        { since },
      ).catch(() => [{}]), // before the migration: no numbers yet
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
          emails,
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
    // The page shows the top 10; ?all=1 is its "See all" list
    const all = req.query.all === "1";
    const replacements = { category, limit: all ? 1000 : 10 };
    const alertFilter = `a.active = true AND (:category = 'all' OR a.category::text = :category)`;

    const [products, productSizes, sizes, brandRows, bestSellers, [wanted]] = await Promise.all([
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
        LIMIT :limit
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
      // How many different products shoppers are waiting on
      select(
        `SELECT COUNT(DISTINCT COALESCE(a.stockx_product_id, LOWER(a.product_name)))::int AS count FROM alerts a WHERE ${alertFilter}`,
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
        wanted_total: wanted.count,
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

// GET /api/platform/searches?days=7&store=<id|all> — mobile vs desktop
// visitors on the stores' sites, and what shoppers type
// into the stores' search bars (searchLog.service.js): the most
// searched, the searches that found nothing (demand nobody's stocking),
// and the latest few as they come in. No names or emails.
const SEARCH_DAYS = [1, 7, 30, 90];
const getSearches = async (req, res) => {
  try {
    const days = SEARCH_DAYS.includes(Number(req.query.days)) ? Number(req.query.days) : 7;
    const store = /^[0-9a-f-]{36}$/i.test(req.query.store || "") ? req.query.store : null;
    const replacements = { since: new Date(Date.now() - days * 24 * 60 * 60 * 1000), store };
    const filter = `l.created_at >= :since AND (CAST(:store AS uuid) IS NULL OR l.store_id = CAST(:store AS uuid))`;

    // Site visits are by day (one row per person per store per day)
    const visitFilter = `v.day >= CAST(:since AS date) AND (CAST(:store AS uuid) IS NULL OR v.store_id = CAST(:store AS uuid))`;

    const [[totals], top, missing, recent, devices, [visitTotals]] = await Promise.all([
      select(
        `
        SELECT COUNT(*)::int AS searches,
               COUNT(DISTINCT l.visitor)::int AS searchers,
               COUNT(*) FILTER (WHERE l.results = 0)::int AS no_results,
               COUNT(*) FILTER (WHERE l.match = 'close')::int AS close_only
        FROM search_logs l
        WHERE ${filter}
        `,
        replacements,
      ),
      select(
        `
        SELECT LOWER(l.query) AS term,
               COUNT(*)::int AS searches,
               COUNT(DISTINCT l.visitor)::int AS searchers,
               COUNT(DISTINCT l.store_id)::int AS stores,
               (ARRAY_AGG(l.results ORDER BY l.updated_at DESC))[1] AS results,
               MAX(l.updated_at) AS last_at
        FROM search_logs l
        WHERE ${filter}
        GROUP BY LOWER(l.query)
        ORDER BY searchers DESC, searches DESC, last_at DESC
        LIMIT 30
        `,
        replacements,
      ),
      select(
        `
        SELECT LOWER(l.query) AS term,
               COUNT(*)::int AS searches,
               COUNT(DISTINCT l.visitor)::int AS searchers,
               STRING_AGG(DISTINCT s.name, ', ') AS store_names,
               MAX(l.updated_at) AS last_at
        FROM search_logs l
        JOIN stores s ON s.id = l.store_id
        WHERE ${filter} AND (l.results = 0 OR l.match = 'close')
        GROUP BY LOWER(l.query)
        ORDER BY searchers DESC, searches DESC, last_at DESC
        LIMIT 20
        `,
        replacements,
      ),
      select(
        `
        SELECT l.id, l.query, l.results, l.match, l.source, l.updated_at, s.name AS store_name
        FROM search_logs l
        JOIN stores s ON s.id = l.store_id
        WHERE ${filter}
        ORDER BY l.updated_at DESC
        LIMIT 40
        `,
        replacements,
      ),
      // Mobile vs desktop: people (not page loads) on each kind of device
      select(
        `
        SELECT v.device, COUNT(DISTINCT v.visitor)::int AS people, COUNT(*)::int AS visits
        FROM site_visits v
        WHERE ${visitFilter}
        GROUP BY v.device
        `,
        replacements,
      ),
      select(
        `SELECT COUNT(DISTINCT v.visitor)::int AS people, COUNT(*)::int AS visits FROM site_visits v WHERE ${visitFilter}`,
        replacements,
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: { days, totals, top, missing, recent, devices: { ...visitTotals, by_device: devices } },
    });
  } catch (error) {
    console.error("Platform searches error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't load searches" });
  }
};

// PUT /api/platform/stores/:id/subdomain { subdomain } — gives a store a
// new address (<subdomain>.syncstock.io). The old one is kept in
// former_subdomains, so old links, bookmarks and printed QR signs
// forward to the new one. Emails, the Shopify blocks and sitemaps build
// their links from the current subdomain, so they follow automatically.
const changeSubdomain = async (req, res) => {
  try {
    const store = /^[0-9a-f-]{36}$/i.test(req.params.id) ? await Store.findByPk(req.params.id) : null;
    if (!store) return res.status(404).json({ success: false, message: "Store not found" });

    const next = String(req.body.subdomain || "").toLowerCase().trim();
    if (!isValidSubdomainFormat(next)) {
      return res.status(400).json({
        success: false,
        message: "Use 3-30 lowercase letters, numbers or hyphens (not starting or ending with a hyphen)",
      });
    }
    if (next === store.subdomain) return res.status(200).json({ success: true, data: { subdomain: next } });
    if (await subdomainTaken(next, store.id)) {
      return res.status(409).json({ success: false, message: "Another store uses that subdomain" });
    }

    // Moving back to an old name takes it off the forwarding list
    const former = [...new Set([...(store.former_subdomains || []), store.subdomain])].filter(
      (s) => s && s !== next,
    );
    const previous = store.subdomain;
    await store.update({ subdomain: next, former_subdomains: former });
    console.log(`Platform admin changed store ${store.id} subdomain: ${previous} -> ${next}`);
    return res.status(200).json({ success: true, data: { subdomain: next, former_subdomains: former } });
  } catch (error) {
    console.error("Change subdomain error:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't change the subdomain" });
  }
};

module.exports = { getOverview, getDemand, getSearches, changeSubdomain };
