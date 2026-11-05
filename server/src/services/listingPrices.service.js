const { Op } = require("sequelize");
const { Inventory, SaleHistory } = require("../models/index.js");
const { titleKey, sizeKey } = require("../utils/skuMatch.js");
const { stats, MIN_SALES } = require("./priceGuide.service.js");

// Pricing → "Your listings": each in-stock listing against what this
// store's own past sales of the same item went for (sales_history, never
// another store's). Works for anything with sales history — sneakers,
// clothing, snowboards — unlike the StockX comparison.
//
// Same item: the SKU first, the exact title (titleKey) if there's no SKU
// or no sales under it. Same condition (new / pre-owned). Pairs with box
// issues are left out, like the price guide. Compared with the typical
// sale price (what buyers paid, before fees), the exact size when it has
// MIN_SALES sales, otherwise every size of that item.

// Within ±10% of the typical sale counts as in line
const BAND = 0.1;

const conditionOf = (inv) => (inv.condition === "pre_owned" ? "used" : "new");

const statusFor = (price, typical) => {
  if (typical == null || !price) return "no_history";
  if (price > typical * (1 + BAND)) return "above";
  if (price < typical * (1 - BAND)) return "below";
  return "in_line";
};

const listingsVsSales = async (store, today = new Date()) => {
  const sales = await SaleHistory.findAll({
    where: { store_id: store.id, flag: null, box_issue: false },
    attributes: ["name", "style_code", "size_key", "condition", "sale_price", "net_price", "cost", "bought_on", "sold_on"],
    raw: true,
  });

  const bySku = new Map();
  const byTitle = new Map();
  const add = (map, key, row) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  };
  for (const r of sales) {
    add(bySku, r.style_code, r);
    add(byTitle, titleKey(r.name), r);
  }

  const listings = await Inventory.findAll({
    where: { store_id: store.id, available: { [Op.gt]: 0 } },
    attributes: ["id", "product_name", "sku", "size", "price", "image_url", "shopify_product_id", "condition", "category"],
    order: [["product_name", "ASC"]],
    raw: true,
  });
  const shopHandle = String(store.shopify_domain || "").replace(/\.myshopify\.com$/, "");

  const rows = listings.map((inv) => {
    const sku = String(inv.sku || "").trim().toUpperCase();
    const skuSales = sku ? bySku.get(sku) : null;
    const pool = skuSales || byTitle.get(titleKey(inv.product_name)) || [];
    const condition = conditionOf(inv);
    const same = pool.filter((r) => r.condition === condition);
    const key = sizeKey(inv.size);
    const exact = key ? same.filter((r) => r.size_key === key) : same;
    const pick = exact.length >= MIN_SALES ? { rows: exact, basis: "size" } : same.length ? { rows: same, basis: "all_sizes" } : null;
    const s = pick ? stats(pick.rows, today) : null;
    const price = Number(inv.price) || null;
    const typical = s?.typical_sale ?? null;
    return {
      id: inv.id,
      product_name: inv.product_name,
      sku: inv.sku,
      size: inv.size,
      condition,
      image_url: inv.image_url,
      price,
      typical_sale: typical,
      typical_payout: s?.typical_payout ?? null,
      vs_typical: price != null && typical != null ? Math.round(price - typical) : null,
      sales: s?.based_on ?? 0,
      basis: pick?.basis || null,
      matched_by: !pick ? null : skuSales ? "sku" : "title",
      days_to_sell: s?.days_to_sell ?? null,
      last_sold: s?.last_sold || null,
      status: statusFor(price, typical),
      shopify_admin_url: shopHandle ? `https://admin.shopify.com/store/${shopHandle}/products/${inv.shopify_product_id}` : null,
    };
  });

  const count = (status) => rows.filter((r) => r.status === status).length;
  return {
    rows,
    summary: {
      listings: rows.length,
      with_history: rows.length - count("no_history"),
      above: count("above"),
      below: count("below"),
      in_line: count("in_line"),
    },
    has_sales: sales.length > 0,
    band_percent: BAND * 100,
  };
};

module.exports = { listingsVsSales, statusFor };
