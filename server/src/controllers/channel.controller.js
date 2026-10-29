const { User, Account } = require("../models/index.js");
const { shopifySession } = require("../utils/shopifySession.js");
const { shopifyStore } = require("../utils/session.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");
const channel = require("../services/channel.service.js");

// The sales channel page inside the Shopify admin (client
// pages/shopify/ChannelHome.jsx): account section (connect / disconnect),
// publishing section, status. Only reachable with Shopify's session token
// — it's the admin's own page for the shop being viewed.

// The shop's public-app store, from Shopify's session token
const requireShopifyStore = async (req, res, next) => {
  try {
    const session = shopifySession(req);
    if (!session) return res.status(401).json({ success: false, message: "Open SyncStock from your Shopify admin" });
    const store = await shopifyStore(session.shop);
    if (!store) {
      return res.status(401).json({ success: false, code: "SHOPIFY_NOT_INSTALLED", message: "SyncStock isn't set up on this store yet" });
    }
    req.store = store;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to resolve store" });
  }
};

const ownerEmail = async (store) => {
  const owner = await User.findOne({
    where: { store_id: store.id, role: "admin" },
    include: [{ model: Account, attributes: ["email"] }],
    order: [["created_at", "ASC"]],
  });
  return owner?.Account?.email || null;
};

const setupDone = (store) => store.onboarding_step === "complete";

const fail = (res, error, fallback) => {
  console.error(`${fallback}:`, error.message);
  return res
    .status(error.userFacing ? 400 : 502)
    .json({ success: false, message: error.userFacing ? error.message : `${fallback}. Try again in a minute.` });
};

// GET /api/store/channel
const getChannel = async (req, res) => {
  const store = req.store;
  const data = {
    store_name: store.name,
    shopper_url: storeBaseUrl(store),
    account_email: await ownerEmail(store),
    setup_complete: setupDone(store),
    setup_step: store.onboarding_step,
    status: store.status,
    billing_status: store.billing_status,
    needs_permission: false,
    connection: null,
    publishing: null,
  };
  try {
    const { appHandle, scopes } = await channel.appInstallation(store);
    if (!channel.hasChannelScope(scopes)) {
      data.needs_permission = true;
      return res.status(200).json({ success: true, data });
    }
    if (data.setup_complete) {
      const connection = await channel.getConnection(store);
      data.connection = connection && { id: connection.id, account_name: connection.accountName };
      if (connection) data.publishing = await channel.publishing(store, appHandle);
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return fail(res, error, "Couldn't load your SyncStock channel from Shopify");
  }
};

// POST /api/store/channel/connect
const connectChannel = async (req, res) => {
  if (!setupDone(req.store)) {
    return res.status(400).json({ success: false, message: "Finish setting up SyncStock first" });
  }
  try {
    const connection = await channel.connect(req.store);
    return res.status(200).json({ success: true, data: { id: connection.id, account_name: connection.accountName } });
  } catch (error) {
    return fail(res, error, "Couldn't connect SyncStock");
  }
};

// POST /api/store/channel/disconnect — the merchant removes the channel
// connection themselves (App Store 5.7.12). Their SyncStock account and
// shopper site stay; Connect brings the channel back.
const disconnectChannel = async (req, res) => {
  try {
    await channel.disconnect(req.store);
    return res.status(200).json({ success: true });
  } catch (error) {
    return fail(res, error, "Couldn't disconnect SyncStock");
  }
};

module.exports = { requireShopifyStore, getChannel, connectChannel, disconnectChannel };
