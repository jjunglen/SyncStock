const { Op } = require("sequelize");
const { sequelize, StockxImageCache, Inventory } = require("../models/index.js");

// Finds a working photo for a StockX catalog product. StockX's API returns
// no image, so the photo's address has to be worked out from the product's
// urlKey and title. Tested on 365 products from The Laboratory's catalog:
// the old single guess found 20%; trying these patterns finds ~61%.
// Each address is checked (a HEAD request) before it's used, so shoppers
// never see a broken image, and the answer is saved in stockx_image_cache
// so each product is only looked up once. Not found is saved too, and
// tried again after a week.
const IMAGE_HOST = "https://images.stockx.com";
const DISPLAY_PARAMS = "?fit=fill&bg=FFFFFF&w=400&h=300&fm=webp&auto=compress&q=90";
const RETRY_MISSES_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_TIMEOUT_MS = 2500;

const titleCase = (w) => w.charAt(0).toUpperCase() + w.slice(1);

// Each urlKey word cased the way the title writes it ("gs" → "GS",
// "gel"/"ds" → "Gel"/"DS"), since StockX's photo names follow the title
const casedFromTitle = (title, tokens) => {
  const words = new Map();
  for (const w of (title || "").replace(/[()'"’]/g, " ").split(/[\s\-/]+/)) {
    if (w) words.set(w.toLowerCase(), w);
  }
  return tokens.map((t) => (t === "x" ? "x" : words.get(t) || titleCase(t)));
};

// Photo names to try, most likely first (order from the test results)
const imageNames = (product) => {
  const base = product.urlKey.split("-");
  const tokenSets = [base];
  // StockX names Jordans with and without the "Air" in different places
  if (base[0] === "jordan") tokenSets.push(["air", ...base]);
  if (base[0] === "air" && base[1] === "jordan") tokenSets.push(base.slice(1));
  // Re-releases are sometimes photographed under the name without the year
  if (/^\d{4}$/.test(base[base.length - 1])) tokenSets.push(base.slice(0, -1));

  const names = [];
  for (const tokens of tokenSets) {
    names.push(casedFromTitle(product.title, tokens).join("-"));
    names.push(tokens.map(titleCase).join("-"));
  }
  return [...new Set(names)];
};

const candidateUrls = (product) => {
  const names = imageNames(product);
  return [
    ...names.map((n) => `${IMAGE_HOST}/images/${n}-Product.jpg`),
    ...names.map((n) => `${IMAGE_HOST}/images/${n}.jpg`),
    ...names.map((n) => `${IMAGE_HOST}/360/${n}/Images/${n}/Lv2/img01.jpg`),
  ];
};

const isImage = async (url) => {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    return resp.ok && (resp.headers.get("content-type") || "").startsWith("image/");
  } catch {
    return false;
  }
};

// All candidates are checked at once; the most likely one that works wins
const findImage = async (product) => {
  const urls = candidateUrls(product);
  const results = await Promise.all(urls.map(isImage));
  const found = urls[results.indexOf(true)];
  return found ? `${found}${DISPLAY_PARAMS}` : null;
};

// Adds image_url (a checked StockX photo, or null) to each product
const withStockxImages = async (products) => {
  const keys = products.map((p) => p.urlKey).filter(Boolean);
  const cached = await StockxImageCache.findAll({ where: { url_key: keys } });
  const known = new Map(
    cached
      .filter((c) => c.image_url || Date.now() - new Date(c.updated_at) < RETRY_MISSES_AFTER_MS)
      .map((c) => [c.url_key, c.image_url]),
  );

  return Promise.all(
    products.map(async (product) => {
      if (!product.urlKey) return { ...product, image_url: null };
      if (known.has(product.urlKey)) return { ...product, image_url: known.get(product.urlKey) };
      const imageUrl = await findImage(product);
      await StockxImageCache.upsert({ url_key: product.urlKey, image_url: imageUrl }).catch(() => {});
      return { ...product, image_url: imageUrl };
    }),
  );
};

// When StockX has no photo, the store's own photo of the same shoe
// (matched by style code, e.g. FV5029-141) if it carries it
const withStorePhotos = async (products, store) => {
  const missing = products.filter((p) => !p.image_url && p.styleId);
  if (!store || missing.length === 0) return products;

  const rows = await Inventory.findAll({
    where: {
      store_id: store.id,
      image_url: { [Op.ne]: null },
      [Op.and]: sequelize.where(
        sequelize.fn("upper", sequelize.col("sku")),
        { [Op.in]: missing.map((p) => p.styleId.toUpperCase()) },
      ),
    },
    attributes: ["sku", "image_url"],
  });
  const bySku = new Map(rows.map((r) => [r.sku.toUpperCase(), r.image_url]));
  return products.map((p) =>
    p.image_url || !p.styleId ? p : { ...p, image_url: bySku.get(p.styleId.toUpperCase()) || null },
  );
};

module.exports = { withStockxImages, withStorePhotos, candidateUrls };
