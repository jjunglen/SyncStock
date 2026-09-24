// Base URL of a store's customer-facing site, used for links in emails,
// push notifications, and redirects. STORE_ROOT_DOMAIN (e.g.
// "syncstock.io") gives https://<subdomain>.syncstock.io. Without it,
// production defaults to syncstock.io and dev falls back to FRONTEND_URL.
const storeBaseUrl = (store) => {
  const rootDomain =
    process.env.STORE_ROOT_DOMAIN ||
    (process.env.NODE_ENV === "production" ? "syncstock.io" : null);

  if (rootDomain && store?.subdomain) {
    return `https://${store.subdomain}.${rootDomain}`;
  }
  return process.env.FRONTEND_URL || "http://localhost:5173";
};

module.exports = { storeBaseUrl };
