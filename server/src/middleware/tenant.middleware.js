const { Store, Account, User } = require("../models/index.js");

// sneakershop.syncstock.io -> sneakershop
const extractSubdomain = (hostname) => {
  if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
    return null;
  }
  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  return parts[0];
};

// Used on customer-facing routes: browsing, setting alerts, dashboard
const resolveStoreFromSubdomain = async (req, res, next) => {
  try {
    let subdomain = extractSubdomain(req.hostname);
    if (!subdomain && process.env.NODE_ENV !== "production") {
      subdomain = req.headers["x-dev-store"] || req.query.store || null;
    }
    if (!subdomain) {
      return res
        .status(400)
        .json({ success: false, message: "Could not determine store" });
    }
    const store = await Store.findOne({ where: { subdomain } });
    if (!store || store.status !== "active") {
      return res
        .status(404)
        .json({ success: false, message: "Store not found or not active" });
    }
    req.store = store;
    next();
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to resolve store" });
  }
};

// Used only on webhook routes — Shopify sends this header on every call.
const resolveStoreFromShopifyDomain = async (req, res, next) => {
  try {
    const shopDomain = req.headers["x-shopify-shop-domain"];
    if (!shopDomain) {
      return res
        .status(400)
        .json({ success: false, message: "Missing shop domain header" });
    }
    const store = await Store.findOne({
      where: { shopify_domain: shopDomain },
    });
    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "No store for this shop domain" });
    }
    req.store = store;
    next();
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to resolve store" });
  }
};

// Attaches req.account and req.membership IF a valid session exists,
// but never fails the request if it doesn't — for routes like
// redirect that need to work whether or not someone's logged in.
const attachAccountIfPresent = async (req, res, next) => {
  try {
    const token = req.cookies.session_token;
    if (!token) return next();

    const { verifyToken } = require("../utils/jwt.js");

    const decoded = verifyToken(token);
    if (!decoded) return next();

    const account = await Account.findByPk(decoded.id);
    if (!account) return next();

    req.account = account;

    if (req.store) {
      req.membership = await User.findOne({
        where: { account_id: account.id, store_id: req.store.id },
      });
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  resolveStoreFromSubdomain,
  resolveStoreFromShopifyDomain,
  attachAccountIfPresent,
};
