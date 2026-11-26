const { Op } = require("sequelize");
const { SaleHistory, StockxPriceCheck } = require("../models/index.js");
const { titleKey } = require("../utils/skuMatch.js");

// "Good deal" for the shopper's product cards and pop-out: the store's
// price against the market for that shoe (by its style code or name,
// never its size):
//   brand new / sealed → StockX: the middle lowest ask across every size
//     the store's Price check matched (stockx_price_checks)
//   pre-owned → the store's own used sales (sales_history, from its CSV):
//     the middle price buyers paid over the last year, from 3 sales up
// A deal is a price within 10% of that market price (or under it).
// Only for stores that turned it on (stores.deal_badges, Store settings).
// Built once an hour per store and kept in memory.

const DEAL_MARGIN = 1.1;
const MIN_SALES = 3;
const SALES_DAYS = 365;
const TTL_MS = 60 * 60 * 1000;

const NEW_CONDITIONS = ["brand_new", "sealed"];
const USED_CONDITIONS = ["pre_owned"];

const cleanStyle = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "-");

const median = (nums) => {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

const push = (map, key, value) => {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
};

const cache = new Map(); // store id → { at, market }

async function buildMarket(storeId) {
  const since = new Date(Date.now() - SALES_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [checks, sales] = await Promise.all([
    StockxPriceCheck.findAll({
      where: { store_id: storeId, status: "matched", lowest_ask: { [Op.ne]: null } },
      attributes: ["inventory_id", "style_id", "lowest_ask"],
      raw: true,
    }),
    SaleHistory.findAll({
      where: { store_id: storeId, condition: "used", flag: null, sold_on: { [Op.gte]: since } },
      attributes: ["name", "style_code", "sale_price"],
      raw: true,
    }),
  ]);

  // StockX, per style code (all sizes together)
  const asks = new Map();
  const itemStyle = new Map();
  for (const c of checks) {
    const style = cleanStyle(c.style_id);
    push(asks, style, Number(c.lowest_ask));
    itemStyle.set(c.inventory_id, style);
  }
  const stockx = new Map([...asks].map(([style, list]) => [style, median(list)]));

  // Used sales, per style code and per name
  const byStyle = new Map();
  const byTitle = new Map();
  for (const s of sales) {
    const price = Number(s.sale_price);
    push(byStyle, cleanStyle(s.style_code), price);
    push(byTitle, titleKey(s.name), price);
  }
  const summarize = (map) =>
    new Map([...map].filter(([, list]) => list.length >= MIN_SALES).map(([k, list]) => [k, { price: median(list), sales: list.length }]));

  return { stockx, itemStyle, usedByStyle: summarize(byStyle), usedByTitle: summarize(byTitle) };
}

async function marketFor(storeId) {
  const hit = cache.get(storeId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.market;
  const market = await buildMarket(storeId);
  cache.set(storeId, { at: Date.now(), market });
  return market;
}

// { source, market, sales? } when the item is a good deal, else null
function dealFor(item, market) {
  const price = Number(item.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  let found = null;
  if (NEW_CONDITIONS.includes(item.condition)) {
    const style = market.itemStyle.get(item.id) || cleanStyle(item.sku);
    const ask = market.stockx.get(style);
    if (ask) found = { source: "stockx", market: Math.round(ask) };
  } else if (USED_CONDITIONS.includes(item.condition)) {
    const used = market.usedByStyle.get(cleanStyle(item.sku)) || market.usedByTitle.get(titleKey(item.product_name));
    if (used) found = { source: "sales", market: Math.round(used.price), sales: used.sales };
  }
  return found && price <= found.market * DEAL_MARGIN ? found : null;
}

// The items as plain objects, each deal marked (item.deal) when the
// store has badges on. Never fails the list: without market data the
// items come back as they are.
async function withDeals(store, items) {
  const plain = items.map((i) => (typeof i?.toJSON === "function" ? i.toJSON() : i));
  if (!store?.deal_badges) return plain;
  try {
    const market = await marketFor(store.id);
    return plain.map((i) => {
      const deal = dealFor(i, market);
      return deal ? { ...i, deal } : i;
    });
  } catch (error) {
    console.error("Deal badges:", error.message);
    return plain;
  }
}

module.exports = { withDeals, dealFor };
