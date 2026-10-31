// The merchant dashboard inside the Shopify admin (the public app is
// embedded). Shopify shows syncstock.io/shopify/... in a frame; that page
// (shopify.html) loads Shopify's App Bridge first. Everything else is the
// normal dashboard, with three differences:
//   - pages live under /shopify (the router's basename)
//   - every API call carries Shopify's session token instead of relying
//     on the login cookie (lib/api.js; cookies don't work in the frame)
//   - Shopify pages (billing approval) open in the whole window
export const IN_SHOPIFY_ADMIN =
  typeof window !== "undefined" && /^\/shopify(\/|$)/.test(window.location.pathname);

export const SHOPIFY_ADMIN_BASE = "/shopify";

// A fresh session token (about a minute long — App Bridge renews it), or
// null outside the admin
export const shopifyIdToken = async () => {
  if (!IN_SHOPIFY_ADMIN || !window.shopify?.idToken) return null;
  try {
    return await window.shopify.idToken();
  } catch {
    return null;
  }
};

// Leave the frame: App Bridge opens `url` in the whole admin window
export const openInWholeWindow = (url) => window.open(url, "_top");

// The app's address in Shopify is this page (www.syncstock.io/shopify —
// App Bridge insists the frame stays on that address). Shopify opens it
// with a signed link (?shop=…&hmac=…), kept here from the first load:
// the server's app entry checks it and starts or finishes the install.
const LAUNCH_QUERY = typeof window !== "undefined" ? window.location.search : "";
export const IN_FRAME = typeof window !== "undefined" && window.top !== window.self;
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const serverEntryUrl = () => `${API_BASE}/store/shopify/app${LAUNCH_QUERY}`;

// Shopify's approval screen, in the whole window (it can't open inside
// the frame) — the fallback when a token exchange isn't possible
const openShopifyApproval = () => {
  if (!new URLSearchParams(LAUNCH_QUERY).get("shop")) return false;
  if (IN_FRAME) openInWholeWindow(serverEntryUrl());
  else window.location.assign(serverEntryUrl());
  return true;
};

// One try per page visit within a minute, so a failing exchange can't
// reload forever
const EXCHANGE_KEY = "syncstock_token_exchange";
const recentlyTried = () => {
  try {
    return Date.now() - Number(sessionStorage.getItem(EXCHANGE_KEY) || 0) < 60_000;
  } catch {
    return false;
  }
};
const markTried = () => {
  try {
    sessionStorage.setItem(EXCHANGE_KEY, String(Date.now()));
  } catch {
    // private mode: no loop guard needed beyond this visit
  }
};

// The app is open in the admin but SyncStock has no working access for
// this shop (Shopify installed it without our install link — e.g. a
// reinstall). Ask the server to trade Shopify's session token for access,
// then reload. Only if Shopify refuses does it fall back to the approval
// screen. Returns true when the page is moving on (reload or redirect).
export const startShopifyInstall = () => {
  if (!IN_SHOPIFY_ADMIN || recentlyTried()) return openShopifyApproval();
  markTried();
  (async () => {
    try {
      const token = await shopifyIdToken();
      if (!token) throw new Error("no session token");
      const resp = await fetch(`${API_BASE}/store/shopify/token-exchange`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`exchange ${resp.status}`);
      window.location.reload();
    } catch {
      openShopifyApproval();
    }
  })();
  return true;
};

// Opened outside the Shopify admin (an install sends the whole window
// here): hand over to the server, which starts Shopify's approval or goes
// back into the admin. Without Shopify's link, it's the normal dashboard.
// Also the reverse: the normal site opened INSIDE the admin's frame
// (Shopify's embedded=1&shop=… on a page without /shopify) switches to the
// admin version of the same page, which signs in through Shopify.
// Returns true when the page is leaving.
export const leaveIfOutsideAdmin = () => {
  if (typeof window === "undefined") return false;
  if (!IN_SHOPIFY_ADMIN && IN_FRAME) {
    const params = new URLSearchParams(LAUNCH_QUERY);
    if (params.get("embedded") === "1" && /\.myshopify\.com$/i.test(params.get("shop") || "")) {
      window.location.replace(`/shopify${window.location.pathname}${LAUNCH_QUERY}`);
      return true;
    }
    return false;
  }
  if (!IN_SHOPIFY_ADMIN || IN_FRAME) return false;
  if (new URLSearchParams(LAUNCH_QUERY).get("shop")) window.location.replace(serverEntryUrl());
  else window.location.replace("/dashboard");
  return true;
};
