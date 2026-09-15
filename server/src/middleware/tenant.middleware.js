const { Store, Account, User } = require("../models/index.js");
const { verifyOnboardingToken } = require("../utils/jwt.js");

const extractSubdomain = (hostname) => {
  if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
    return null;
  }
  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  return parts[0];
};

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

const resolveStoreForOnboarding = async (req, res, next) => {
  const token = req.headers["x-onboarding-token"];

  if (token) {
    const result = verifyOnboardingToken(token);

    if (result.valid) {
      const store = await Store.findByPk(result.storeId);
      if (store) {
        req.store = store;
        return next();
      }
    }

    if (!result.expired) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid onboarding link" });
    }
  }

  return resolveStoreFromSubdomain(req, res, next);
};

const resolveStoreFromAdminMembership = async (req, res, next) => {
  if (!req.account) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const membership = await User.findOne({
    where: { account_id: req.account.id, role: "admin" },
  });

  if (!membership) {
    return res
      .status(403)
      .json({ success: false, message: "No store found for this account" });
  }

  const store = await Store.findByPk(membership.store_id);
  if (!store) {
    return res.status(404).json({ success: false, message: "Store not found" });
  }

  req.store = store;
  next();
};

module.exports = {
  resolveStoreFromSubdomain,
  resolveStoreFromShopifyDomain,
  attachAccountIfPresent,
  resolveStoreForOnboarding,
  resolveStoreFromAdminMembership,
};
