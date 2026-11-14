const { searchStockX } = require("./stockx.service.js");

// Coming soon items (sneakers and clothing) looked up on StockX for their
// colorway, and a photo when the
// store hasn't added one yet. Matched by style code when the item has one,
// otherwise only when every word of the item's name is in StockX's title,
// so a wrong shoe is never shown. Answers (found or not) are remembered
// for a day; a request looks up at most NEW_PER_REQUEST new items, and the
// rest fill in on the next visit.
const STOCKX_CATEGORIES = ["sneakers", "clothing"];
const CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 3000;
const NEW_PER_REQUEST = 12;
const found = new Map(); // lookup key → { at, match }

const code = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const words = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
// A style code: letters and digits together, at least 5 long (FV5029-141)
const looksLikeStyleCode = (sku) => /\d/.test(sku || "") && /[a-z]/i.test(sku || "") && code(sku).length >= 5;

const pick = (item, results) => {
  if (looksLikeStyleCode(item.sku)) {
    const byCode = results.find((r) => r.styleId && code(r.styleId) === code(item.sku));
    if (byCode) return byCode;
  }
  const wanted = words(item.name);
  if (wanted.length < 2) return null;
  return results.find((r) => {
    const title = new Set(words(r.title));
    return wanted.every((w) => title.has(w));
  }) || null;
};

const details = (product) => {
  const a = product.productAttributes || {};
  return {
    image_url: product.image_url || null,
    colorway: a.colorway || null,
    style_code: product.styleId || null,
  };
};

const lookUp = async (item) => {
  const query = looksLikeStyleCode(item.sku) ? item.sku : item.name;
  const results = await searchStockX(query, 5);
  const match = pick(item, results);
  return match ? details(match) : null;
};

const keyOf = (item) => `${code(item.sku)}|${words(item.name).join(" ")}`;

// items: grouped Coming soon products ({ name, sku, category, image_url })
// Adds `stockx` (details, or null) and fills image_url from StockX when
// missing (photo_source: "stockx" so the page can say it's a stock photo)
const withStockxDetails = async (items) => {
  if (!process.env.STOCKX_API_KEY) return items;
  const now = Date.now();
  let budget = NEW_PER_REQUEST;
  const lookups = await Promise.all(
    items.map(async (item) => {
      if (!STOCKX_CATEGORIES.includes(item.category)) return null;
      const key = keyOf(item);
      const hit = found.get(key);
      if (hit && now - hit.at < CACHE_MS) return hit.match;
      if (budget <= 0) return null;
      budget -= 1;
      try {
        const match = await lookUp(item);
        if (found.size >= CACHE_MAX) found.delete(found.keys().next().value);
        found.set(key, { at: now, match });
        return match;
      } catch (error) {
        console.error("StockX lookup for Coming soon failed:", error.message);
        return null;
      }
    }),
  );
  return items.map((item, i) => {
    const match = lookups[i];
    if (!match) return { ...item, stockx: null };
    const { image_url: stockxPhoto, ...info } = match;
    return {
      ...item,
      stockx: info,
      ...(!item.image_url && stockxPhoto && { image_url: stockxPhoto, photo_source: "stockx" }),
    };
  });
};

module.exports = { withStockxDetails };
