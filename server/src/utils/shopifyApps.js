const crypto = require("crypto");

// SyncStock runs two Shopify apps while moving between them:
//   custom — the original app (custom distribution). Only The Laboratory
//            can install it, and it can't bill. Keys: SHOPIFY_APP_CLIENT_ID
//            / SHOPIFY_APP_CLIENT_SECRET.
//   public — the new app (public distribution): any store, Shopify
//            Billing. Keys: SHOPIFY_PUBLIC_APP_CLIENT_ID /
//            SHOPIFY_PUBLIC_APP_CLIENT_SECRET. Until Shopify's app review
//            approves it, only development stores can install it.
// Each store remembers which app it installed (stores.shopify_app), and
// everything Shopify sends is checked against THAT app's secret.
const APPS = {
  custom: {
    clientId: () => process.env.SHOPIFY_APP_CLIENT_ID,
    secret: () => process.env.SHOPIFY_APP_CLIENT_SECRET,
  },
  public: {
    clientId: () => process.env.SHOPIFY_PUBLIC_APP_CLIENT_ID,
    secret: () => process.env.SHOPIFY_PUBLIC_APP_CLIENT_SECRET,
  },
};

const isConfigured = (key) => !!(APPS[key]?.clientId() && APPS[key]?.secret());

const appCredentials = (key) => {
  const app = APPS[key];
  if (!app || !isConfigured(key)) throw new Error(`Shopify app "${key}" isn't configured`);
  return { clientId: app.clientId(), secret: app.secret() };
};

// Which app a connect should use: an explicit choice (?app=public, e.g.
// to move a store over), else the app the store already uses, else the
// public app for new stores (falling back to custom if it isn't set up)
const appForConnect = (requested, existingStore) => {
  if (requested && isConfigured(requested)) return requested;
  if (existingStore?.shopify_app && isConfigured(existingStore.shopify_app)) return existingStore.shopify_app;
  return isConfigured("public") ? "public" : "custom";
};

const hmacMatches = (secret, body, signature) => {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  const a = Buffer.from(signature, "base64");
  const b = Buffer.from(expected, "base64");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Links Shopify sends (installs, opening the app, the OAuth callback) are
// signed over their sorted query string, as a hex HMAC
const queryHmacValid = (query, secret) => {
  if (!secret || typeof query.hmac !== "string") return false;
  const message = Object.keys(query)
    .filter((key) => key !== "hmac" && key !== "signature")
    .sort()
    .map((key) => `${key}=${Array.isArray(query[key]) ? query[key].join(",") : query[key]}`)
    .join("&");
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const a = Buffer.from(query.hmac, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Which configured app signed this link, or null
const appThatSignedQuery = (query) =>
  Object.keys(APPS).find((key) => isConfigured(key) && queryHmacValid(query, APPS[key].secret())) || null;

// Which configured app signed this webhook body, or null
const appThatSigned = (body, signature) =>
  Object.keys(APPS).find((key) => isConfigured(key) && hmacMatches(APPS[key].secret(), body, signature)) || null;

module.exports = {
  APPS,
  isConfigured,
  appCredentials,
  appForConnect,
  hmacMatches,
  appThatSigned,
  queryHmacValid,
  appThatSignedQuery,
};
