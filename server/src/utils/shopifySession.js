const jwt = require("jsonwebtoken");
const { appCredentials, isConfigured } = require("./shopifyApps.js");

// Shopify session tokens: inside the Shopify admin (the public app is
// embedded), the dashboard asks App Bridge for a short-lived token (about
// a minute) and sends it as "Authorization: Bearer <token>". Shopify signs
// it with the public app's secret, so a valid one proves the request comes
// from someone signed in to that store's Shopify admin — no SyncStock
// login or cookie needed (cookies don't work in the admin's frame).
// Only the public app is embedded; the Lab's custom app isn't.
// https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens

const SHOP_HOST = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

// The shop ("x.myshopify.com") a valid session token is for, or null
const verifySessionToken = (token) => {
  if (!token || !isConfigured("public")) return null;
  try {
    const { clientId, secret } = appCredentials("public");
    const claims = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      audience: clientId,
      clockTolerance: 10, // seconds — small clock differences
    });
    const shop = new URL(claims.dest).hostname.toLowerCase();
    const issuer = new URL(claims.iss).hostname.toLowerCase();
    if (!SHOP_HOST.test(shop) || issuer !== shop) return null;
    return { shop, staffId: claims.sub || null, claims };
  } catch {
    return null;
  }
};

// The bearer token on a request, if it looks like a Shopify session token
// (the phone app also sends bearer tokens — those are SyncStock's own and
// never verify here)
const bearerToken = (req) => /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "")?.[1]?.trim() || null;

// The verified Shopify session on this request, or null (cached per request)
const shopifySession = (req) => {
  if (req._shopifySession === undefined) req._shopifySession = verifySessionToken(bearerToken(req));
  return req._shopifySession;
};

module.exports = { verifySessionToken, shopifySession };
