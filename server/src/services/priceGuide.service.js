const { Op } = require("sequelize");
const { SaleHistory } = require("../models/index.js");
const { titleKey, sizeKey } = require("../utils/skuMatch.js");

// Trade-in price guide from a store's own sales history (sales_history —
// never another store's): SKU → brand new / pre-owned → size. Offers are
// based on what the store actually keeps (the payout after fees):
//   offer = typical payout × (1 − the store's margin for that condition)
// Pairs with box issues (no box, damaged or replacement box, missing lid)
// are priced separately so they don't drag good pairs down.

const RECENT_DAYS = 180; // recent sales first…
const MIN_SALES = 3; // …when there are at least this many

const DAY_MS = 24 * 60 * 60 * 1000;

const median = (nums) => {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

const marginFor = (store, condition) => (condition === "used" ? store.buy_margin_used : store.buy_margin_new) ?? (condition === "used" ? 40 : 30);

// Typical numbers for a set of sales (recent ones first)
const stats = (rows, today = new Date()) => {
  if (!rows.length) return null;
  const since = new Date(today.getTime() - RECENT_DAYS * DAY_MS).toISOString().slice(0, 10);
  const recent = rows.filter((r) => r.sold_on >= since);
  const basis = recent.length >= MIN_SALES ? recent : rows;
  const days = basis
    .filter((r) => r.bought_on && r.sold_on >= r.bought_on)
    .map((r) => (new Date(r.sold_on) - new Date(r.bought_on)) / DAY_MS);
  const round = (n) => (n === null ? null : Math.round(n));
  return {
    sales: rows.length,
    based_on: basis.length,
    recent_only: basis === recent,
    typical_payout: round(median(basis.map((r) => Number(r.net_price)))),
    typical_sale: round(median(basis.map((r) => Number(r.sale_price)))),
    typical_paid: round(median(basis.filter((r) => r.cost !== null).map((r) => Number(r.cost)))),
    days_to_sell: round(median(days)),
    last_sold: rows.reduce((a, r) => (r.sold_on > a ? r.sold_on : a), ""),
  };
};

const withOffer = (s, margin) =>
  s && { ...s, offer: s.typical_payout === null ? null : Math.round(s.typical_payout * (1 - margin / 100)), confidence: s.sales >= MIN_SALES ? "exact" : "few" };

// The guide for a search: one group per item (SKU, or title when there's
// none), each split by condition, then size
const buildGuide = (rows, store, { size } = {}, today = new Date()) => {
  const groups = new Map();
  for (const r of rows) {
    const key = r.style_code || `title:${titleKey(r.name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const wantSize = sizeKey(size);
  const items = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([key, list]) => {
      const names = list.reduce((acc, r) => ((acc[r.name] = (acc[r.name] || 0) + 1), acc), {});
      const name = Object.entries(names).sort((a, b) => b[1] - a[1])[0][0];
      const conditions = {};
      for (const condition of ["new", "used"]) {
        const all = list.filter((r) => r.condition === condition);
        if (!all.length) continue;
        const margin = marginFor(store, condition);
        const clean = all.filter((r) => !r.box_issue);
        const bySize = new Map();
        for (const r of clean) {
          const k = r.size_key || "—";
          if (wantSize && k !== wantSize) continue;
          if (!bySize.has(k)) bySize.set(k, { size: r.size || "—", rows: [] });
          bySize.get(k).rows.push(r);
        }
        conditions[condition] = {
          margin,
          overall: withOffer(stats(clean, today), margin),
          box_issue: withOffer(stats(all.filter((r) => r.box_issue), today), margin),
          sizes: [...bySize.values()]
            .map(({ size: label, rows: sr }) => ({ size: label, ...withOffer(stats(sr, today), margin) }))
            .sort((a, b) => (parseFloat(a.size) || 999) - (parseFloat(b.size) || 999) || a.size.localeCompare(b.size)),
        };
      }
      return {
        key,
        style_code: key.startsWith("title:") ? null : key,
        name,
        sales: list.length,
        matched_by: key.startsWith("title:") ? "title" : list.some((r) => r.matched_by === "sku") ? "sku" : list[0].matched_by,
        conditions,
      };
    });
  return { items, groups: groups.size };
};

// One suggested offer for a pair a shopper wants to sell. Tries the exact
// size, then every size of that item in the same condition.
//   item: { style_code, product_name, size, condition, box }
//   box: "original" | "damaged" | "none"
const suggest = (rows, store, item, today = new Date()) => {
  const margin = marginFor(store, item.condition);
  const same = rows.filter((r) => r.condition === item.condition && !r.flag);
  const goodBox = !item.box || item.box === "original";
  const boxRows = same.filter((r) => r.box_issue === !goodBox);
  const pool = boxRows.length >= MIN_SALES ? boxRows : same;
  const key = sizeKey(item.size);
  const exact = pool.filter((r) => r.size_key === key);
  const pick = exact.length >= MIN_SALES ? { rows: exact, confidence: "exact" } : pool.length ? { rows: pool, confidence: "estimate" } : null;
  if (!pick) return { confidence: "none", margin, offer: null, typical_payout: null, based_on: 0, days_to_sell: null };
  const s = stats(pick.rows, today);
  return {
    confidence: pick.confidence,
    margin,
    typical_payout: s.typical_payout,
    offer: s.typical_payout === null ? null : Math.round(s.typical_payout * (1 - margin / 100)),
    based_on: s.based_on,
    days_to_sell: s.days_to_sell,
    box_priced_separately: boxRows.length >= MIN_SALES && !goodBox,
  };
};

const COLUMNS = ["name", "size", "size_key", "style_code", "matched_by", "condition", "box_issue", "net_price", "sale_price", "cost", "bought_on", "sold_on", "flag"];

// Sales for a search: a SKU, or a name with every word in it
const guideFor = async (store, { q, size }) => {
  const term = String(q || "").trim();
  if (term.length < 2) return null;
  const words = term.split(/\s+/).filter(Boolean).slice(0, 8);
  const rows = await SaleHistory.findAll({
    where: {
      store_id: store.id,
      flag: null,
      [Op.or]: [
        { style_code: term.toUpperCase() },
        { [Op.and]: words.map((w) => ({ name: { [Op.iLike]: `%${w.replace(/[%_\\]/g, "\\$&")}%` } })) },
      ],
    },
    attributes: COLUMNS,
    order: [["sold_on", "DESC"]],
    limit: 3000,
    raw: true,
  });
  return { query: term, size: size || null, ...buildGuide(rows, store, { size }) };
};

// Suggested offer for one pair (Buy requests)
const suggestFor = async (store, item) => {
  const code = String(item.style_code || "").trim().toUpperCase();
  const where = { store_id: store.id, flag: null };
  if (code) where.style_code = code;
  else if (item.product_name) where.name = { [Op.iLike]: String(item.product_name).trim() };
  else return suggest([], store, item);
  const rows = await SaleHistory.findAll({ where, attributes: COLUMNS, raw: true, limit: 3000 });
  return suggest(rows, store, item);
};

module.exports = { buildGuide, suggest, guideFor, suggestFor, sizeKey, stats, MIN_SALES };
