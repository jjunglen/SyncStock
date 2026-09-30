const { Op, literal } = require("sequelize");
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

// SQL: every search word (or one of its alternatives) is in a field
const wordMatchCondition = (query) => {
  const groups = words(query).map((word) => {
    const options = alternativesFor(word).flatMap((sequence) => {
      const pattern = sequelize.escape(sequenceRegex(sequence));
      return FIELDS.map((field) => `"Inventory"."${field}" ~* ${pattern}`);
    });
    return `(${options.join(" OR ")})`;
  });
  return groups.length ? literal(groups.join(" AND ")) : null;
};

const similarity = (query) =>
  `extensions.word_similarity(${sequelize.escape(query.toLowerCase())}, lower("Inventory"."product_name"))`;

const cleanQuery = (q) => String(q || "").trim().slice(0, MAX_QUERY_LENGTH);

// Runs the search on top of the page's other filters (`where`).
// Returns { count, rows, match } — match is "exact", "close" or "all".
const searchInventoryItems = async (Inventory, { where, q, order, limit, offset }) => {
  const query = cleanQuery(q);
  const condition = query ? wordMatchCondition(query) : null;
  if (!condition) {
    const { count, rows } = await Inventory.findAndCountAll({ where, order, limit, offset });
    return { count, rows, match: "all" };
  }

  const exact = await Inventory.findAndCountAll({
    where: { ...where, [Op.and]: [...(where[Op.and] || []), condition] },
    order,
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

module.exports = { searchInventoryItems, wordMatchCondition, cleanQuery };
