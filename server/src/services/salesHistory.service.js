const crypto = require("crypto");
const { SaleHistory } = require("../models/index.js");
const { planSkuFixes, sizeKey } = require("../utils/skuMatch.js");

// The Lab's "All Items Sold" sheet (exported from Google Sheets as CSV),
// read into sales_history for trade-in price guides. The sheet has no
// header row; columns by position:
//   0 name · 1 size · 2 condition note · 3 style code · 4 sold price
//   5 cost · 6 date bought · 7 margin (ignored) · 8 date sold
//   9 sales channel · 10+ notes ("NC" etc., ignored)
// "Week N" and "Before 3/7" style rows have no prices and are skipped.

// A plain CSV reader: quoted fields, commas and line breaks in quotes
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

const money = (s) => {
  const t = String(s || "").trim().replace(/[$,\s]/g, "");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};

// "1/5/25" → "2025-01-05". A year past this one is a typo for ten years
// earlier (the sheet has a few 2036s that are 2026).
const day = (s) => {
  const text = String(s || "").trim();
  // Also 2026-10-05 (how some sheets export dates)
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) return day(`${iso[2]}/${iso[3]}/${iso[1]}`);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(text);
  if (!m) return null;
  let year = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
  const thisYear = new Date().getFullYear();
  while (year > thisYear) year -= 10;
  const month = Number(m[1]);
  const date = Number(m[2]);
  if (month < 1 || month > 12 || date < 1 || date > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
};

// eBay prices on the sheet are the payout after eBay's fee: 13% of the
// sale price under $150, 7% from $150 up. Added back to get what the
// buyer paid.
// The sheet's first sales are from 2025 — earlier sold dates are typos
const SHEET_START = "2025-01-01";

const EBAY_FEE_LOW = 0.13;
const EBAY_FEE_HIGH = 0.07;
const EBAY_FEE_STEP = 150;
const ebaySalePrice = (payout) => {
  const high = payout / (1 - EBAY_FEE_HIGH);
  return high >= EBAY_FEE_STEP ? high : payout / (1 - EBAY_FEE_LOW);
};

// The sheet spells channels several ways (and with typos: "WESBITE",
// "EAY", "INSTOE CADR")
const channelOf = (raw) => {
  const c = String(raw || "").trim().toUpperCase();
  if (!c) return "other";
  const squashed = c.replace(/[^A-Z]/g, "");
  if (squashed.includes("WHATNOT")) return "whatnot";
  if (squashed.includes("STOCKX")) return "stockx";
  if (squashed.includes("GOAT") || squashed.includes("ALIAS")) return "goat"; // Alias is GOAT's seller app
  if (/^(EBAY|EAY|WBAY|EBY|EBA)$/.test(squashed) || squashed.includes("EBAY")) return "ebay";
  if (/WEB|WSEB|WES|SHOPIFY|^SHOP$|ONLINE/.test(squashed)) return "website";
  if (/INSTO|STORE|CASH|CARD|CADR|GIFT|ZELLE|TENDER|SYSTEM/.test(squashed)) return "in_store";
  return "other";
};

// Blank (or "Brand New") = brand new. Worn, VNDS (very near deadstock),
// tried on and pre-owned count as used; box notes (no box, replacement
// box, damaged box, missing lid) are kept separately.
const conditionOf = (note) => {
  const n = String(note || "").toUpperCase();
  return {
    condition: /WORN|VNDS|TRIED|USED|PRE[\s-]?OWNED/.test(n) ? "used" : "new",
    box_issue: /BOX|LID/.test(n),
  };
};

const styleKey = (code) => {
  const s = String(code || "").trim().toUpperCase().replace(/\s+/g, " ");
  return s || null;
};

// Reads the CSV into sale rows plus a summary of what was skipped or
// flagged and why. Nothing is saved here.
const readSalesCsv = (text, sourceFile = null, storeId = null) => {
  const sales = [];
  const skipped = {};
  const flagged = [];
  const skip = (reason) => (skipped[reason] = (skipped[reason] || 0) + 1);
  const seen = new Map(); // identical rows: numbered so each one counts once

  for (const r of parseCsv(String(text || "").replace(/^﻿/, ""))) {
    if (!r.some((c) => c.trim())) continue; // blank line
    const name = (r[0] || "").trim();
    const net = money(r[4]);
    if (/^week\b/i.test(name) || net === null) {
      if (!/^week\b/i.test(name)) skip("Note rows (no price)");
      continue;
    }
    const channel = channelOf(r[9]);
    if (channel === "whatnot") {
      skip("Whatnot (test run)");
      continue;
    }
    if (net <= 0) {
      skip("Sold for $0");
      continue;
    }
    const soldOn = day(r[8]);
    if (!soldOn) {
      skip("No sold date");
      continue;
    }
    if (!name) {
      skip("No item name");
      continue;
    }

    // A sold year from before the sheet begins (e.g. 2006 for 2026) is a
    // typo: moved to the year it was bought, or the year after — never
    // past today. Other dates are kept as written.
    const boughtOn = day(r[6]);
    let sold = soldOn;
    const today = new Date().toISOString().slice(0, 10);
    if (boughtOn && sold < SHEET_START && sold < boughtOn) {
      const sameYear = `${boughtOn.slice(0, 4)}${sold.slice(4)}`;
      const nextYear = `${Number(boughtOn.slice(0, 4)) + 1}${sold.slice(4)}`;
      sold = sameYear >= boughtOn ? sameYear : nextYear <= today ? nextYear : sameYear;
    }

    const cost = money(r[5]);
    const salePrice = channel === "ebay" ? ebaySalePrice(net) : net;
    const { condition, box_issue } = conditionOf(r[2]);
    const row = {
      name,
      size: (r[1] || "").trim() || null,
      size_key: sizeKey(r[1]),
      style_code: styleKey(r[3]),
      raw_style_code: styleKey(r[3]),
      matched_by: "sku",
      store_id: storeId,
      condition,
      condition_note: (r[2] || "").trim() || null,
      box_issue,
      channel,
      channel_note: (r[9] || "").trim() || null,
      net_price: Math.round(net * 100) / 100,
      sale_price: Math.round(salePrice * 100) / 100,
      cost: cost === null ? null : Math.round(cost * 100) / 100,
      bought_on: boughtOn,
      sold_on: sold,
      flag: null,
      source_file: sourceFile,
    };

    // A sale over 8× its cost and above $2,000 is most likely a typo
    // ($13,650 for a $1,200 pair) — kept but left out of price guides
    if (row.cost && row.sale_price > 2000 && row.sale_price > row.cost * 8) {
      row.flag = "Sale price looks like a typo";
    }
    if (row.flag) flagged.push({ name: row.name, size: row.size, sale_price: row.sale_price, cost: row.cost, sold_on: row.sold_on, flag: row.flag });

    const base = [storeId, row.name, row.size, row.condition_note, row.style_code, row.net_price, row.cost, row.bought_on, row.sold_on, row.channel_note]
      .map((v) => String(v ?? "").toLowerCase())
      .join("|");
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    row.row_key = crypto.createHash("sha256").update(`${base}#${n}`).digest("hex");
    sales.push(row);
  }
  return { sales, skipped, flagged };
};

const summarize = (sales) => {
  const by = (key) => sales.reduce((acc, s) => ((acc[s[key]] = (acc[s[key]] || 0) + 1), acc), {});
  const dates = sales.map((s) => s.sold_on).sort();
  return {
    sales: sales.length,
    first_sale: dates[0] || null,
    last_sale: dates[dates.length - 1] || null,
    by_condition: by("condition"),
    by_channel: by("channel"),
    style_codes: new Set(sales.map((s) => s.style_code).filter(Boolean)).size,
    without_style_code: sales.filter((s) => !s.style_code).length,
  };
};

// Which of these rows are already saved (by fingerprint)
const existingKeys = async (keys) => {
  const found = new Set();
  for (let i = 0; i < keys.length; i += 2000) {
    const rows = await SaleHistory.findAll({ where: { row_key: keys.slice(i, i + 2000) }, attributes: ["row_key"], raw: true });
    for (const r of rows) found.add(r.row_key);
  }
  return found;
};

// Re-runs SKU matching over a store's whole history (utils/skuMatch.js),
// so a new batch can fix or borrow SKUs using earlier ones
const normalizeStore = async (storeId) => {
  const rows = await SaleHistory.findAll({
    where: { store_id: storeId },
    attributes: ["id", "name", "raw_style_code", "style_code", "matched_by", "flag"],
    raw: true,
  });
  const changes = planSkuFixes(rows);
  // Grouped so each distinct change is one UPDATE
  const groups = new Map();
  for (const c of changes) {
    const k = JSON.stringify([c.style_code, c.matched_by, c.flag]);
    if (!groups.has(k)) groups.set(k, { values: c, ids: [] });
    groups.get(k).ids.push(c.id);
  }
  for (const { values, ids } of groups.values()) {
    await SaleHistory.update(
      { style_code: values.style_code, matched_by: values.matched_by, flag: values.flag },
      { where: { id: ids } },
    );
  }
  return changes.length;
};

// Preview (dryRun) or import into one store. Rows already saved are left
// alone. The preview also shows how SKUs would be matched.
const importSalesCsv = async (text, sourceFile, { dryRun = true, storeId } = {}) => {
  const { sales, skipped, flagged } = readSalesCsv(text, sourceFile, storeId);
  const saved = await existingKeys(sales.map((s) => s.row_key));
  const fresh = sales.filter((s) => !saved.has(s.row_key));
  const plan = planSkuFixes(sales.map((s, i) => ({ ...s, id: i })));
  const matching = plan.reduce((acc, c) => ((acc[c.matched_by] = (acc[c.matched_by] || 0) + 1), acc), {});
  matching.too_general = plan.filter((c) => c.flag === "Too general to price").length;
  let normalized = 0;
  if (!dryRun) {
    for (let i = 0; i < fresh.length; i += 1000) {
      await SaleHistory.bulkCreate(fresh.slice(i, i + 1000), { ignoreDuplicates: true });
    }
    normalized = await normalizeStore(storeId);
  }
  return {
    imported: !dryRun,
    file: sourceFile,
    ...summarize(sales),
    new_sales: fresh.length,
    already_saved: sales.length - fresh.length,
    skipped,
    flagged: flagged.slice(0, 25),
    flagged_count: flagged.length,
    matching,
    normalized,
  };
};

// Totals for the admin page
const salesTotals = async (storeId) => {
  const { sequelize } = SaleHistory;
  const [row] = await sequelize.query(
    `SELECT COUNT(*)::int AS sales,
            COUNT(*) FILTER (WHERE condition = 'new')::int AS new_sales,
            COUNT(*) FILTER (WHERE condition = 'used')::int AS used_sales,
            COUNT(DISTINCT style_code)::int AS style_codes,
            MIN(sold_on) AS first_sale, MAX(sold_on) AS last_sale,
            COUNT(*) FILTER (WHERE flag IS NOT NULL)::int AS flagged
       FROM sales_history WHERE store_id = :storeId`,
    { type: sequelize.QueryTypes.SELECT, replacements: { storeId: storeId || null } },
  );
  const files = await sequelize.query(
    `SELECT source_file, COUNT(*)::int AS sales, MAX(created_at) AS imported_at
       FROM sales_history WHERE store_id = :storeId GROUP BY source_file ORDER BY MAX(created_at) DESC LIMIT 20`,
    { type: sequelize.QueryTypes.SELECT, replacements: { storeId: storeId || null } },
  );
  return { ...row, files };
};

module.exports = { parseCsv, readSalesCsv, importSalesCsv, normalizeStore, salesTotals, ebaySalePrice };
