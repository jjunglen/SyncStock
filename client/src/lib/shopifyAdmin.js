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
