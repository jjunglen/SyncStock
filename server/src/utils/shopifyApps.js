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
// Values are trimmed and stripped of wrapping quotes — a pasted space or
// quote in a Railway variable would otherwise break every signature check
const env = (name) => (process.env[name] || "").trim().replace(/^["']|["']$/g, "") || undefined;

const APPS = {
  custom: {
    clientId: () => env("SHOPIFY_APP_CLIENT_ID"),
    secret: () => env("SHOPIFY_APP_CLIENT_SECRET"),
  },
  public: {
    clientId: () => env("SHOPIFY_PUBLIC_APP_CLIENT_ID"),
    secret: () => env("SHOPIFY_PUBLIC_APP_CLIENT_SECRET"),
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
// signed as a hex HMAC over their query string with hmac removed and the
// rest sorted by name. Checked two ways: over the query exactly as Shopify
// sent it (values still URL-encoded — what Shopify signs when values like
// `host` contain "=" or "%"), and over the decoded values (what plain
// values look like either way). Either matching is a valid signature.
const safeEqual = (a, b) => {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const rawQueryMessage = (rawQuery) =>
  String(rawQuery || "")
    .split("&")
    .filter(Boolean)
    .filter((pair) => !/^(hmac|signature)=/.test(pair))
    .sort()
    .join("&");

const decodedQueryMessage = (query) =>
  Object.keys(query)
    .filter((key) => key !== "hmac" && key !== "signature")
    .sort()
    .map((key) => `${key}=${Array.isArray(query[key]) ? query[key].join(",") : query[key]}`)
    .join("&");

const queryHmacValid = (query, secret, rawQuery) => {
  if (!secret || typeof query.hmac !== "string") return false;
  const sign = (message) => crypto.createHmac("sha256", secret).update(message).digest("hex");
  return (
    (rawQuery !== undefined && safeEqual(query.hmac, sign(rawQueryMessage(rawQuery)))) ||
    safeEqual(query.hmac, sign(decodedQueryMessage(query)))
  );
};

// Which configured app signed this link, or null
const appThatSignedQuery = (query, rawQuery) =>
  Object.keys(APPS).find((key) => isConfigured(key) && queryHmacValid(query, APPS[key].secret(), rawQuery)) || null;

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
