import { register } from "@shopify/web-pixels-extension";

// Syncstock web pixel — runs on the merchant's storefront and checkout.
//
// 1. Remembers the Syncstock click that brought this browser to the
//    store: from the cart tag our "Buy now" link puts on the cart, or a
//    ?syncstock_click= link.
// 2. When a checkout completes, reports "order X came from click Y" to
//    Syncstock — including checkouts that skip the tagged cart, like a
//    product page's "Buy it now" / Shop Pay button.
// The server reads the order from Shopify and only counts it if the
// click matches a variant bought, within 7 days
// (server/src/services/attribution.service.js).

const CLICK_ATTRIBUTE = "syncstock_click_id";
const URL_PARAM = "syncstock_click";
const STORAGE_KEY = "syncstock_click";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const attributeValue = (attributes) =>
  (attributes || []).find((attr) => attr.key === CLICK_ATTRIBUTE)?.value || null;

register(({ analytics, browser, settings, init }) => {
  const apiUrl = (settings.apiUrl || "").replace(/\/$/, "");
  const shop = init.data?.shop?.myshopifyDomain;

  const remember = async (clickId) => {
    if (!clickId || !UUID_RE.test(clickId)) return;
    try {
      await browser.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: clickId, at: Date.now() }),
      );
    } catch {
      // Storage blocked — the cart tag still works on its own
    }
  };

  const recall = async () => {
    try {
      const saved = JSON.parse((await browser.localStorage.getItem(STORAGE_KEY)) || "null");
      if (saved?.id && Date.now() - saved.at < MAX_AGE_MS) return saved.id;
    } catch {
      // Nothing usable saved
    }
    return null;
  };

  analytics.subscribe("page_viewed", (event) => {
    try {
      const url = new URL(event.context.document.location.href);
      remember(url.searchParams.get(URL_PARAM));
    } catch {
      // Unparseable URL — ignore
    }
  });

  // The "Buy now" link lands on the cart page with our tag on the cart
  analytics.subscribe("cart_viewed", (event) => {
    remember(attributeValue(event.data?.cart?.attributes));
  });

  analytics.subscribe("checkout_started", (event) => {
    remember(attributeValue(event.data?.checkout?.attributes));
  });

  analytics.subscribe("checkout_completed", async (event) => {
    const checkout = event.data?.checkout;
    const orderId = checkout?.order?.id;
    const clickIds = [
      ...new Set([attributeValue(checkout?.attributes), await recall()].filter(Boolean)),
    ];
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
