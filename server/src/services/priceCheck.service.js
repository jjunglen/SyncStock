const { Op } = require("sequelize");
const { Inventory, StockxPriceCheck } = require("../models/index.js");
const { getAccessToken, STOCKX_BASE_URL } = require("./stockx.service.js");

// Merchant "Price check": the store's brand-new, original-box pairs
// against StockX — lowest ask, highest bid, and whether the lowest ask is
// the store's own StockX listing. Flagship store only for now (plan
// "internal"), since it runs on The Laboratory's own StockX seller
// account. Shoppers never see any of this.
//
// Shared StockX limit: requests go one at a time, ~1 per second, and the
// StockX product/size match is kept so later runs only fetch prices.
const ELIGIBLE = { condition: "brand_new", box_status: "Original Box (Good)" };
const GAP_MS = 1000;
const progress = new Map(); // storeId → { running, done, total, startedAt, finishedAt, error }

const isPriceCheckEnabled = (store) => store?.plan === "internal";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// GET to the StockX API, paced, retrying with backoff when StockX is busy
let lastCall = 0;
const stockx = async (path, attempt = 0) => {
  const since = Date.now() - lastCall;
  if (since < GAP_MS) await wait(GAP_MS - since);
  lastCall = Date.now();
  const token = await getAccessToken();
  const resp = await fetch(`${STOCKX_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": process.env.STOCKX_API_KEY },
  });
  // Too many requests, or StockX briefly down (5xx) — back off and retry
  if ((resp.status === 429 || resp.status >= 500) && attempt < 4) {
    await wait(5000 * (attempt + 1));
    return stockx(path, attempt + 1);
  }
  if (!resp.ok) throw new Error(`StockX ${resp.status} on ${path.split("?")[0]}`);
  return resp.json();
};

const cleanStyle = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "-");

// Our sizes look like "10M/11.5W" — men's and women's numbers
const ourSize = (size) => ({
  m: parseFloat((size || "").match(/([\d.]+)\s*M/i)?.[1]),
  w: parseFloat((size || "").match(/([\d.]+)\s*W/i)?.[1]),
});

// A StockX size as { type, n } from its default US conversion ("us m",
// "us w", "us y" for kids)
const stockxSize = (variant) => {
  const conv = variant.sizeChart?.defaultConversion;
  const n = parseFloat(String(conv?.size ?? variant.variantValue).replace(/[^\d.]/g, ""));
  return { type: conv?.type || "us m", n };
};

const matchVariant = (variants, size) => {
  const ours = ourSize(size);
  return variants.find((v) => {
    const { type, n } = stockxSize(v);
    return type === "us w" ? n === ours.w : n === ours.m;
  });
};

// The store's active StockX asks: variantId → lowest amount
const ownAsks = async () => {
  const asks = new Map();
  for (let page = 1; page <= 20; page++) {
    const data = await stockx(`/selling/listings?pageNumber=${page}&pageSize=100&listingStatuses=ACTIVE`);
    for (const l of data.listings || []) {
      const id = l.variant?.variantId;
      const amount = Number(l.amount);
      if (id && (!asks.has(id) || amount < asks.get(id))) asks.set(id, amount);
    }
    if (!data.hasNextPage) break;
  }
  return asks;
};

const runPriceCheck = async (store) => {
  if (progress.get(store.id)?.running) return;
  const state = { running: true, done: 0, total: 0, startedAt: new Date(), finishedAt: null, error: null };
  progress.set(store.id, state);

  try {
    const pairs = await Inventory.findAll({
      where: { store_id: store.id, category: "sneakers", available: { [Op.gt]: 0 }, ...ELIGIBLE },
      attributes: ["id", "sku", "size"],
    });
    const existing = new Map(
      (await StockxPriceCheck.findAll({ where: { store_id: store.id } })).map((r) => [r.inventory_id, r]),
    );

    // Group pairs by style code — one StockX lookup per shoe
    const byStyle = new Map();
    for (const p of pairs) {
      const style = cleanStyle(p.sku);
      if (!byStyle.has(style)) byStyle.set(style, []);
      byStyle.get(style).push(p);
    }
    state.total = byStyle.size;
    const asks = await ownAsks();

    for (const [style, group] of byStyle) {
      try {
        const known = group.map((p) => existing.get(p.id)).find((r) => r?.stockx_product_id);
        let productId = known?.stockx_product_id || null;
        let variants = null;

        if (!productId) {
          const found = await stockx(`/catalog/search?query=${encodeURIComponent(style)}&pageSize=10`);
          productId = (found.products || []).find((x) => cleanStyle(x.styleId) === style)?.productId || null;
        }
        if (!productId) {
          await StockxPriceCheck.bulkCreate(
            group.map((p) => ({ inventory_id: p.id, store_id: store.id, style_id: style, status: "no_product", checked_at: new Date() })),
            { updateOnDuplicate: ["status", "style_id", "checked_at"] },
          );
          continue;
        }

        // Size matches: reuse saved ones; look up the sizes only if needed
        const needSizes = group.some((p) => !existing.get(p.id)?.stockx_variant_id);
        if (needSizes) variants = await stockx(`/catalog/products/${productId}/variants`);
        const market = await stockx(`/catalog/products/${productId}/market-data?currencyCode=USD`);
        const marketByVariant = new Map((market || []).map((m) => [m.variantId, m]));

        await StockxPriceCheck.bulkCreate(
          group.map((p) => {
            const variantId = existing.get(p.id)?.stockx_variant_id || matchVariant(variants || [], p.size)?.variantId || null;
            const m = variantId ? marketByVariant.get(variantId) : null;
            const ask = m?.standardMarketData?.lowestAsk ?? m?.lowestAskAmount;
            const bid = m?.standardMarketData?.highestBidAmount ?? m?.highestBidAmount;
            return {
              inventory_id: p.id,
              store_id: store.id,
              style_id: style,
              stockx_product_id: productId,
              stockx_variant_id: variantId,
              status: variantId ? "matched" : "no_size",
              lowest_ask: ask != null ? Number(ask) : null,
              highest_bid: bid != null ? Number(bid) : null,
              own_ask: variantId && asks.has(variantId) ? asks.get(variantId) : null,
              checked_at: new Date(),
            };
          }),
          {
            updateOnDuplicate: [
              "style_id", "stockx_product_id", "stockx_variant_id", "status",
              "lowest_ask", "highest_bid", "own_ask", "checked_at",
            ],
          },
        );
      } catch (error) {
        console.error(`Price check: ${style} failed — ${error.message}`);
      } finally {
        state.done++;
      }
    }

    // Pairs that sold or no longer qualify drop off the page
    await StockxPriceCheck.destroy({
      where: { store_id: store.id, inventory_id: { [Op.notIn]: pairs.map((p) => p.id) } },
    });
  } catch (error) {
    state.error = error.message;
    console.error(`Price check failed for ${store.subdomain}:`, error.message);
  } finally {
    state.running = false;
    state.finishedAt = new Date();
  }
};

const priceCheckProgress = (store) => progress.get(store.id) || null;

module.exports = { runPriceCheck, priceCheckProgress, isPriceCheckEnabled, matchVariant, ELIGIBLE };
