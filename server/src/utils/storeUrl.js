const LOCAL_HOST = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/;

// The domain store subdomains live under: STORE_ROOT_DOMAIN if set,
// otherwise taken from FRONTEND_URL (https://www.syncstock.io →
// syncstock.io). Null for local dev, where there are no subdomains.
const storeRootDomain = () => {
  if (process.env.STORE_ROOT_DOMAIN) return process.env.STORE_ROOT_DOMAIN;
  try {
    const host = new URL(process.env.FRONTEND_URL).hostname;
    if (LOCAL_HOST.test(host)) return null;
    return host.replace(/^www\./, "");
  } catch {
    return process.env.NODE_ENV === "production" ? "syncstock.io" : null;
  }
};

// Base URL of a store's customer-facing site (https://<subdomain>.
// syncstock.io), used for links in emails, push, texts, and redirects.
// Local dev falls back to FRONTEND_URL.
const storeBaseUrl = (store) => {
  const rootDomain = storeRootDomain();
  if (rootDomain && store?.subdomain) {
    return `https://${store.subdomain}.${rootDomain}`;
  }
  return process.env.FRONTEND_URL || "http://localhost:5173";
};

// Only allow same-site paths ("/store/dashboard?item=...") as post-login
// redirects — rejects full URLs and protocol-relative "//evil.com"
const safeRedirectPath = (value) => {
  if (typeof value !== "string" || value.length > 500) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  return value;
};

module.exports = { storeBaseUrl, safeRedirectPath };
