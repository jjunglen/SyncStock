import { register } from "@shopify/web-pixels-extension";

// Syncstock web pixel — runs on the merchant's storefront and checkout.
//
// 1. Remembers every Syncstock click that brought this browser to the
//    store in the last 7 days (up to 10): from the cart tags our "Buy now"
//    and cart links put on the cart (syncstock_click_id, _2, _3, …), or a
//    ?syncstock_click= link. Remembering all of them — not just the last —
//    means a shopper who clicked several alerts and then buys the first
//    one with "Buy it now" still counts.
// 2. When a checkout completes, reports "order X came from clicks Y, Z" to
//    Syncstock — including checkouts that skip the tagged cart, like a
//    product page's "Buy it now" / Shop Pay button.
// The server reads the order from Shopify and only counts a click that
// matches what was bought, within 7 days
// (server/src/services/attribution.service.js).

const CLICK_ATTRIBUTE_RE = /^syncstock_click_id(_\d+)?$/;
const URL_PARAM = "syncstock_click";
const STORAGE_KEY = "syncstock_clicks";
const LEGACY_STORAGE_KEY = "syncstock_click";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CLICKS = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every click ID in a cart's or checkout's attributes
const attributeValues = (attributes) =>
  (attributes || [])
    .filter((attr) => CLICK_ATTRIBUTE_RE.test(attr.key || ""))
    .map((attr) => attr.value)
    .filter((value) => UUID_RE.test(value || ""));

register(({ analytics, browser, settings, init }) => {
  const apiUrl = (settings.apiUrl || "").replace(/\/$/, "");
  const shop = init.data?.shop?.myshopifyDomain;

  // [{ id, at }], newest first, within the last 7 days
  const recall = async () => {
    let saved = [];
    try {
      saved = JSON.parse((await browser.localStorage.getItem(STORAGE_KEY)) || "[]");
      // The single click the previous pixel version kept
      const legacy = JSON.parse((await browser.localStorage.getItem(LEGACY_STORAGE_KEY)) || "null");
      if (legacy?.id) saved.push(legacy);
    } catch {
      // Nothing usable saved
    }
    const now = Date.now();
    return (Array.isArray(saved) ? saved : []).filter(
      (c) => c && UUID_RE.test(c.id || "") && now - c.at < MAX_AGE_MS,
    );
  };

  // Saves run one at a time — events fire together (e.g. landing on the
  // cart page), and two saves at once would overwrite each other
  let saving = Promise.resolve();
  const remember = (clickIds) => {
    const fresh = clickIds.filter((id) => UUID_RE.test(id || ""));
    if (fresh.length === 0) return saving;
    saving = saving.then(async () => {
      try {
        const now = Date.now();
        const existing = (await recall()).filter((c) => !fresh.includes(c.id));
        const next = [...fresh.map((id) => ({ id, at: now })), ...existing].slice(0, MAX_CLICKS);
        await browser.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        await browser.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // Storage blocked — the cart tags still work on their own
      }
    });
    return saving;
  };

  analytics.subscribe("page_viewed", (event) => {
    try {
      const url = new URL(event.context.document.location.href);
      remember([url.searchParams.get(URL_PARAM)]);
    } catch {
      // Unparseable URL — ignore
    }
  });

  // The "Buy now" / cart links land on the cart page with our tags on it
  analytics.subscribe("cart_viewed", (event) => {
    remember(attributeValues(event.data?.cart?.attributes));
  });

  analytics.subscribe("checkout_started", (event) => {
    remember(attributeValues(event.data?.checkout?.attributes));
  });

  analytics.subscribe("checkout_completed", async (event) => {
    const checkout = event.data?.checkout;
    const orderId = checkout?.order?.id;
    await saving; // any click still being saved
    const clickIds = [
      ...new Set([
        ...attributeValues(checkout?.attributes),
        ...(await recall()).map((c) => c.id),
      ]),
    ].slice(0, MAX_CLICKS);
    if (!apiUrl || !shop || !orderId || clickIds.length === 0) return;

    // text/plain keeps this a "simple" request with no CORS preflight
    fetch(`${apiUrl}/api/pixel/checkout`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ shop, order_id: orderId, click_ids: clickIds }),
      keepalive: true,
    }).catch(() => {});
  });
});
