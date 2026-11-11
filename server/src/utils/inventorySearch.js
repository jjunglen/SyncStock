const { Op, literal, fn, col } = require("sequelize");
const { sequelize } = require("../config/database.js");

// Inventory search (Browse and In stock), in two passes:
//
// 1. Word by word — every word in the search must appear in the product
//    name, style code or brand, in any order: "jordan retro" finds
//    "Jordan 4 Retro …", "dunk panda" finds "Nike Dunk Low Panda". Words
//    match from their start ("jord" works while typing); numbers must match
//    whole ("4" doesn't match "40" or "2024"). Common nicknames count as
//    the full name (af1 → Air Force 1, yzy ↔ Yeezy).
// 2. Close matches — only if pass 1 finds nothing: products whose name is
//    most similar to the search (Postgres pg_trgm), for typos like
//    "jordon 4" or "supremme box logo". The response says so, so the page
//    can label them.

// Nicknames → what they can also mean (each is a word sequence)
const NICKNAMES = {
  af1: [["air", "force", "1"]],
  aj: [["air", "jordan"], ["jordan"]],
  yzy: [["yeezy"]],
  yeezy: [["yzy"]],
  nb: [["new", "balance"]],
  tn: [["air", "max", "plus"]],
  fog: [["fear", "of", "god"]],
  lv: [["louis", "vuitton"]],
  ow: [["off", "white"]],
  assc: [["anti", "social", "social", "club"]],
  bbc: [["billionaire", "boys", "club"]],
  ee: [["eric", "emanuel"]],
};

// Close matches must be at least this similar (0–1). Tested on The
// Laboratory's catalog: "jordon 4" scores 0.50, "supremme box logo" 0.84,
// keyboard mashing ~0.29.
const FUZZY_THRESHOLD = 0.45;
const MAX_QUERY_LENGTH = 80;

const words = (text) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// All the ways one search word can be written
const alternativesFor = (word) => {
  const alts = [[word]];
  const aj = word.match(/^aj(\d{1,2})$/); // aj4 → jordan 4
  if (aj) alts.push(["jordan", aj[1]]);
  alts.push(...(NICKNAMES[word] || []));
  // "jordans" → "jordan", "dunks" → "dunk"
  if (word.length > 4 && word.endsWith("s")) alts.push([word.slice(0, -1)]);
  return alts;
};

// A Postgres regex for a word sequence. [[:alnum:]] boundaries rather
// than \m / \M keep backslashes out of the SQL.
const sequenceRegex = (sequence) => {
  const edge = "[^[:alnum:]]";
  const body = sequence.join(`${edge}+`);
  const last = sequence[sequence.length - 1];
  // Numbers match whole; letters match from the start of a word
  const end = /^\d+$/.test(last) ? `($|${edge})` : "";
  return `(^|${edge})${body}${end}`;
};

const FIELDS = ["product_name", "sku", "brand"];

// The style code with only letters and numbers, so "CT8527100",
// "ct8527 100" and "CT8527-100" are the same code
const SKU_CODE = `regexp_replace(lower(coalesce("Inventory"."sku", '')), '[^a-z0-9]', '', 'g')`;
const codeOf = (query) => words(query).join("");
const MIN_CODE_LENGTH = 6;

// SQL: every search word (or one of its alternatives) is in a field, or
// the search is a style code written without its dash
const wordMatchCondition = (query, fields = FIELDS) => {
  const groups = words(query).map((word) => {
    const options = alternativesFor(word).flatMap((sequence) => {
      const pattern = sequelize.escape(sequenceRegex(sequence));
      return fields.map((field) => `"Inventory"."${field}" ~* ${pattern}`);
    });
    return `(${options.join(" OR ")})`;
  });
  if (!groups.length) return null;
  const code = codeOf(query);
  const byCode =
    fields.includes("sku") && code.length >= MIN_CODE_LENGTH && /\d/.test(code)
      ? ` OR ${SKU_CODE} = ${sequelize.escape(code)}`
      : "";
  return literal(`((${groups.join(" AND ")})${byCode})`);
};

const similarity = (query) =>
  `extensions.word_similarity(${sequelize.escape(query.toLowerCase())}, lower("Inventory"."product_name"))`;

const cleanQuery = (q) => String(q || "").trim().slice(0, MAX_QUERY_LENGTH);

// Best match first: how closely an item matches the search, 0 (best) to 3
//   0  the style code, ignoring dashes and spaces ("dz5485 612")
//   1  the whole name ("Jordan 4 Retro Bred Reimagined")
//   2  the search appears in the name as typed ("dunk low" → "Nike Dunk Low …")
//   3  every word is there somewhere (name, brand or code, any order)
// then the most similar names, then `then` (newest). Where the search
// sits in the name doesn't count: most names start with the brand.
const relevanceOrder = (query, then = []) => {
  const list = words(query);
  if (!list.length) return then;
  const code = codeOf(query);
  const name = 'lower("Inventory"."product_name")';
  const phrase = sequenceRegex(list);
  const codeRank = code.length >= 4 ? `WHEN ${SKU_CODE} = ${sequelize.escape(code)} THEN 0` : "";
  const rank = `CASE ${codeRank}
    WHEN btrim(regexp_replace(${name}, '[^a-z0-9]+', ' ', 'g')) = ${sequelize.escape(list.join(" "))} THEN 1
    WHEN ${name} ~ ${sequelize.escape(phrase)} THEN 2
    ELSE 3 END`;
  return [[literal(rank), "ASC"], [literal(similarity(query)), "DESC"], ...then];
};

// Runs the search on top of the page's other filters (`where`).
// Returns { count, rows, match } — match is "exact", "close" or "all".
//   bestMatch — best matches first (relevanceOrder), `order` breaking
//   ties; otherwise just `order` (a sort the shopper chose)
const searchInventoryItems = async (Inventory, { where, q, order, limit, offset, bestMatch = false }) => {
  const query = cleanQuery(q);
  const condition = query ? wordMatchCondition(query) : null;
  if (!condition) {
    const { count, rows } = await Inventory.findAndCountAll({ where, order, limit, offset });
    return { count, rows, match: "all" };
  }

  const exact = await Inventory.findAndCountAll({
    where: { ...where, [Op.and]: [...(where[Op.and] || []), condition] },
    order: bestMatch ? relevanceOrder(query, order) : order,
    limit,
    offset,
  });
  if (exact.count > 0) return { ...exact, match: "exact" };

  // Nothing — try close matches, most similar first
  const close = await Inventory.findAndCountAll({
    where: {
      ...where,
      [Op.and]: [...(where[Op.and] || []), literal(`${similarity(query)} >= ${FUZZY_THRESHOLD}`)],
    },
    order: [[literal(similarity(query)), "DESC"], ...order],
    limit,
    offset,
  });
  return { ...close, match: close.count > 0 ? "close" : "exact" };
};

// Suggestions while typing: up to 6 product names (best match first,
// one per name) and up to 3 brands, among the items in `where`
const SUGGESTED_PRODUCTS = 6;
const SUGGESTED_BRANDS = 3;
const suggestInventory = async (Inventory, { where, q }) => {
  const query = cleanQuery(q);
  const none = { products: [], brands: [] };
  if (query.replace(/[^a-z0-9]/gi, "").length < 2) return none;
  const condition = wordMatchCondition(query);
  if (!condition) return none;
  const and = where[Op.and] || [];

  const [rows, brandRows] = await Promise.all([
    Inventory.findAll({
      where: { ...where, [Op.and]: [...and, condition] },
      attributes: ["product_name", "image_url"],
      order: relevanceOrder(query, [["created_at", "DESC"]]),
      limit: 40,
    }),
    Inventory.findAll({
      where: { ...where, [Op.and]: [...and, wordMatchCondition(query, ["brand"])] },
      attributes: ["brand", [fn("COUNT", col("id")), "count"]],
      group: ["brand"],
      order: [[literal('"count"'), "DESC"]],
      limit: SUGGESTED_BRANDS,
      raw: true,
    }),
  ]);

  const products = new Map();
  for (const row of rows) {
    const key = row.product_name.trim().toLowerCase();
    if (!products.has(key)) products.set(key, { name: row.product_name.trim(), image_url: row.image_url });
    if (products.size >= SUGGESTED_PRODUCTS) break;
  }
  return {
    products: [...products.values()],
    brands: brandRows.filter((b) => b.brand).map((b) => ({ brand: b.brand, count: Number(b.count) })),
  };
};

module.exports = { searchInventoryItems, suggestInventory, relevanceOrder, wordMatchCondition, cleanQuery };
