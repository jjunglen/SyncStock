const { Op } = require("sequelize");
const { Store, Account, User } = require("../models/index.js");
const { verifyOnboardingToken } = require("../utils/jwt.js");
const { findSessionAccount } = require("../utils/session.js");

const extractSubdomain = (hostname) => {
  if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
    return null;
  }
  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  if (parts[0] === "www") return null;
  return parts[0];
};

const resolveStoreFromSubdomain = async (req, res, next) => {
  try {
    let subdomain =
      req.headers["x-store-subdomain"] || extractSubdomain(req.hostname);
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
    const { account } = await findSessionAccount(req, Account);
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

const attachStoreIfPresent = async (req, res, next) => {
  try {
    const subdomain =
      req.headers["x-store-subdomain"] || extractSubdomain(req.hostname);
    const resolvedSubdomain =
      subdomain ||
      (process.env.NODE_ENV !== "production"
        ? req.headers["x-dev-store"] || req.query.store
        : null);

    if (resolvedSubdomain) {
      const store = await Store.findOne({
        where: { subdomain: resolvedSubdomain },
      });
      if (store && store.status === "active") {
        req.store = store;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

const resolveStoreForOnboarding = async (req, res, next) => {
  try {
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
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to resolve store" });
  }
};

// The unfinished store this merchant is onboarding. Before their account
// exists, the onboarding link from the Shopify connect step identifies
// it; after that, only the store's logged-in owner (admin) can continue —
// which is what lets them leave and resume later.
const findOnboardingStore = async (req) => {
  const { account } = await findSessionAccount(req, Account);
  if (account) {
    const membership = await User.findOne({
      where: { account_id: account.id, role: "admin" },
      include: [{ model: Store, where: { onboarding_step: { [Op.ne]: "complete" } } }],
      order: [["created_at", "DESC"]],
    });
    if (membership) return { store: membership.Store, account };
  }

  const token = req.headers["x-onboarding-token"];
  const result = token ? verifyOnboardingToken(token) : { valid: false };
  if (result.valid) {
    const store = await Store.findByPk(result.storeId);
    if (store) return { store, account: null, expired: false };
  }
  return { store: null, account, expired: !!result.expired };
};

// GET /store/onboarding — link or owner session
const resolveOnboardingStore = async (req, res, next) => {
  try {
    const { store, account, expired } = await findOnboardingStore(req);
    if (!store) {
      return res.status(401).json({
        success: false,
        message: expired
          ? "Your setup link expired — log in, or reconnect your Shopify store"
          : "Log in to continue setting up your store",
      });
    }
    req.store = store;
    req.account = account;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to resolve store" });
  }
};

// Subdomain and plan steps: the store's logged-in owner only
const requireOnboardingOwner = async (req, res, next) => {
  try {
    const { store, account } = await findOnboardingStore(req);
    if (!store || !account) {
      return res
        .status(401)
        .json({ success: false, message: "Log in to continue setting up your store" });
    }
    const isOwner = await User.findOne({
      where: { account_id: account.id, store_id: store.id, role: "admin" },
    });
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Only the store owner can do this" });
    }
    req.store = store;
    req.account = account;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to resolve store" });
  }
};

const resolveStoreFromAdminMembership = async (req, res, next) => {
  try {
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
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to resolve store" });
  }
};

module.exports = {
  resolveStoreFromSubdomain,
  resolveStoreFromShopifyDomain,
  attachAccountIfPresent,
  resolveStoreForOnboarding,
  resolveOnboardingStore,
  requireOnboardingOwner,
  resolveStoreFromAdminMembership,
  attachStoreIfPresent
};
