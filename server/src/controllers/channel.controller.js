const { User, Account, Inventory } = require("../models/index.js");
const { syncCatalog } = require("../services/catalogSync.service.js");
const { shopifySession } = require("../utils/shopifySession.js");
const { shopifyStore } = require("../utils/session.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");
const channel = require("../services/channel.service.js");
const autoPublish = require("../services/autoPublish.service.js");

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

// Re-reads the catalog in the background, so shoppers see exactly what's
// published to SyncStock (the channel page doesn't wait for it)
const resyncInBackground = (store) => {
  syncCatalog(store)
    .then(({ products }) => console.log(`Channel resync for ${store.shopify_domain}: ${products} products`))
    .catch((error) => console.error(`Channel resync failed for ${store.shopify_domain}:`, error.message));
};

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
    auto_publish: null,
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
      data.auto_publish = {
        mode: await autoPublish.getMode(store),
        has_permission: autoPublish.hasPublishingScopes(scopes),
      };
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
    resyncInBackground(req.store);
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
    // Nothing is published to a disconnected channel: hidden from shoppers
    // now (Connect re-reads what's published)
    await Inventory.update({ published: false }, { where: { store_id: req.store.id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    return fail(res, error, "Couldn't disconnect SyncStock");
  }
};

// Brings the catalog in line with the setting, in the background
const reconcileInBackground = (store) => {
  autoPublish
    .reconcileStore(store)
    .then((r) => console.log(`Auto-publish ${store.shopify_domain} (${r.mode}): ${r.published} published, ${r.unpublished} unpublished`))
    .catch((error) => console.error(`Auto-publish catch-up failed for ${store.shopify_domain}:`, error.message));
};

// PUT /api/store/channel/auto-publish { mode } — the merchant's choice.
// Saved even before the publishing permission is approved; the reply says
// whether Shopify still needs to ask (the page then opens the approval).
const setAutoPublish = async (req, res) => {
  const { mode } = req.body || {};
  if (!autoPublish.MODES.includes(mode)) {
    return res.status(400).json({ success: false, message: "Choose Off, Match my Online Store, or Everything that's active" });
  }
  try {
    await autoPublish.setMode(req.store, mode);
    const { scopes } = await channel.appInstallation(req.store);
    const hasPermission = autoPublish.hasPublishingScopes(scopes);
    if (mode !== "off" && hasPermission) reconcileInBackground(req.store);
    return res.status(200).json({
      success: true,
      data: { mode, has_permission: hasPermission, needs_permission: mode !== "off" && !hasPermission },
    });
  } catch (error) {
    return fail(res, error, "Couldn't save automatic publishing");
  }
};

module.exports = { requireShopifyStore, getChannel, connectChannel, disconnectChannel, setAutoPublish };
