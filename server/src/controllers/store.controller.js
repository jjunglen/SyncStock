const crypto = require("crypto");
const { Op } = require("sequelize");
const { Store, Inventory, User, Account } = require("../models/index.js");
const { enabledCategories, logoUrl, textOnColor, smsAvailable } = require("../utils/storeSettings.js");
const { REF_COOKIE, SOURCES, refCookieOptions } = require("../utils/signupSource.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");
const { syncCatalog } = require("../services/catalogSync.service.js");
const { tokenFields } = require("../utils/shopifyToken.js");
const { API_VERSION, shopifyGraphql } = require("../utils/shopifyGraphql.js");const {
  appForConnect,
  appCredentials,
  isConfigured,
  queryHmacValid,
  appThatSignedQuery,
  APPS,
} = require("../utils/shopifyApps.js");
const {
  isBillingExempt,
  createSubscription,
  subscriptionStatus,
} = require("../services/billing.service.js");
const { signOnboardingToken } = require("../utils/jwt.js");
const { getPagination, buildMeta } = require("../utils/pagination.js");

const RESERVED_SUBDOMAINS = [
  "www",
  "api",
  "app",
  "admin",
  "mail",
  "syncstock",
  "store",
];

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const generateSubdomain = async (name) => {
  let base = slugify(name) || "store";
  if (RESERVED_SUBDOMAINS.includes(base)) base = `${base}-shop`;

  let candidate = base;
  let suffix = 1;
  while (await Store.findOne({ where: { subdomain: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
};

const isValidSubdomainFormat = (value) => {
  if (!value || value.length < 3 || value.length > 30) return false;
  if (!/^[a-z0-9-]+$/.test(value)) return false;
  if (value.startsWith("-") || value.endsWith("-")) return false;
  if (RESERVED_SUBDOMAINS.includes(value)) return false;
  return true;
};

// Webhooks SyncStock needs on each store. Each arrives at
// /api/webhooks/shopify/<topic> (webhook.routes.js).
const WEBHOOK_TOPICS = [
  "products/create",
  "products/update",
  "products/delete",
  "orders/create",
  // Takes the store offline when the merchant uninstalls (can't go in
  // shopify.app.toml with the app's own install flow)
  "app/uninstalled",
  // Subscription cancelled / payment problems (billing.controller.js)
  "app_subscriptions/update",
];
// "products/create" → GraphQL's PRODUCTS_CREATE
const topicEnum = (topic) => topic.replace("/", "_").toUpperCase();
const webhookUri = (topic) => `${process.env.BACKEND_URL}/api/webhooks/shopify/${topic}`;

const registerShopifyWebhooks = async (store) => {
  const shop = store.shopify_domain;
  const existing = new Set();
  try {
    const data = await shopifyGraphql(store, `{ webhookSubscriptions(first: 100) { nodes { topic uri } } }`);
    for (const sub of data.webhookSubscriptions.nodes) existing.add(`${sub.topic} ${sub.uri}`);
  } catch (error) {
    console.error(`Couldn't list webhooks for ${shop}:`, error.message);
  }

  for (const topic of WEBHOOK_TOPICS) {
    if (existing.has(`${topicEnum(topic)} ${webhookUri(topic)}`)) {
      console.log(`Webhook already registered, skipping: ${topic}`);
      continue;
    }
    try {
      const data = await shopifyGraphql(
        store,
        `mutation ($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
          webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
            userErrors { field message }
          }
        }`,
        { topic: topicEnum(topic), sub: { uri: webhookUri(topic), format: "JSON" } },
      );
      const errors = data.webhookSubscriptionCreate?.userErrors || [];
      if (errors.length) {
        console.error(`Shopify refused the ${topic} webhook for ${shop}: ${JSON.stringify(errors)}`);
      }
    } catch (error) {
      console.error(`Failed to register ${topic} webhook for ${shop}:`, error.message);
    }
  }
};

// The whole catalog, when a store connects (catalogSync.service.js)
const backfillInventory = async (store) => {
  try {
    const { products } = await syncCatalog(store);
    console.log(`Backfilled ${products} products for store ${store.id}`);
  } catch (error) {
    console.error("Backfill inventory error:", error.message);
  }
};

// Private beta: only stores already on Syncstock (The Laboratory) can
// connect, plus any listed in BETA_SHOP_DOMAINS (comma-separated
// x.myshopify.com). MERCHANT_SIGNUPS_OPEN=true opens it to everyone.
const BETA_CLOSED_MESSAGE =
  "Syncstock is in private beta. Email hello@syncstock.io to get your store on the list.";

// A bare x.myshopify.com domain — nothing else may reach our token requests
const isShopDomain = (shop) => typeof shop === "string" && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);

const canConnect = async (shop) => {
  if (process.env.MERCHANT_SIGNUPS_OPEN === "true") return true;
  const invited = (process.env.BETA_SHOP_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (invited.includes(shop.toLowerCase())) return true;
  return !!(await Store.findOne({ where: { shopify_domain: shop }, attributes: ["id"] }));
};

const initiateShopifyConnect = async (req, res) => {
  const { shop } = req.query;
  if (!isShopDomain(shop)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid shop domain required" });
  }
  if (!(await canConnect(shop))) {
    return res.redirect(`${process.env.FRONTEND_URL}/onboarding?error=beta`);
  }

  // Which SyncStock app to install (utils/shopifyApps.js). ?app=public
  // moves an existing store over; otherwise it keeps the app it has.
  const existing = await Store.findOne({ where: { shopify_domain: shop }, attributes: ["shopify_app"] });
  return startOAuth(res, shop, appForConnect(req.query.app, existing));
};

// Sends the merchant to Shopify to approve SyncStock (OAuth), for one of
// the two apps. Remembers the app and a CSRF state for the callback.
const startOAuth = (res, shop, appKey) => {
  const { clientId } = appCredentials(appKey);

  const state = crypto.randomBytes(16).toString("hex");
  const oauthCookie = {
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
  res.cookie("shopify_oauth_state", state, oauthCookie);
  res.cookie("shopify_oauth_app", appKey, oauthCookie);

  const redirectUri = `${process.env.BACKEND_URL}/api/store/shopify/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${process.env.SHOPIFY_APP_SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return res.redirect(installUrl);
};

// Turns on the Syncstock web pixel for this store — the extension in
// shopify-app/extensions/syncstock-pixel. It needs the write_pixels and
// read_customer_events scopes and a deployed app version that includes
// the extension. Without it, sales still count through the cart tag, so
// a failure here is logged and never blocks connecting the store.
const activateWebPixel = async (store, accessToken, shop) => {
  const settings = JSON.stringify({ apiUrl: process.env.BACKEND_URL });
  const gql = async (query, variables) => {
    const resp = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    return resp.json();
  };

  try {
    const created = await gql(
      `mutation ($settings: JSON!) {
        webPixelCreate(webPixel: { settings: $settings }) {
          userErrors { code message }
          webPixel { id }
        }
      }`,
      { settings },
    );
    let pixelId = created.data?.webPixelCreate?.webPixel?.id;

    // Already made on an earlier connect — refresh its settings instead
    if (!pixelId) {
      const existing = await gql(`{ webPixel { id } }`);
      const existingId = existing.data?.webPixel?.id;
      if (existingId) {
        const updated = await gql(
          `mutation ($id: ID!, $settings: JSON!) {
            webPixelUpdate(id: $id, webPixel: { settings: $settings }) {
              userErrors { code message }
              webPixel { id }
            }
          }`,
          { id: existingId, settings },
        );
        pixelId = updated.data?.webPixelUpdate?.webPixel?.id;
      }
    }

    if (pixelId) {
      await store.update({ web_pixel_id: pixelId });
      console.log(`Web pixel active for ${shop}`);
    } else {
      console.warn(
        `Web pixel not activated for ${shop}:`,
        JSON.stringify(created.errors || created.data?.webPixelCreate?.userErrors),
      );
    }
  } catch (error) {
    console.error(`Web pixel activation failed for ${shop}:`, error.message);
  }
};

const handleShopifyCallback = async (req, res) => {
  try {
    const { shop, code, state } = req.query;

    if (req.cookies.shopify_oauth_state !== state) {
      return res.status(403).send("Invalid state — possible CSRF attempt");
    }
    // The app this install started with (set in initiateShopifyConnect)
    const appKey = isConfigured(req.cookies.shopify_oauth_app) ? req.cookies.shopify_oauth_app : null;
    if (!appKey) return res.status(403).send("Install session expired — start again");
    const app = appCredentials(appKey);

    // Only ever send the code (and our secret) to a real Shopify store
    if (!isShopDomain(shop) || typeof code !== "string" || !code) {
      return res.status(400).send("Invalid shop");
    }

    // Shopify only trades the one-time code for a token when it issued
    // that code to this app for this shop, and the state cookie ties the
    // callback to the browser that started it — so a successful exchange
    // proves the callback is genuine even if the signature check misses
    // (e.g. Shopify still signing with a pre-rotation secret).
    const rawQuery = req.originalUrl.split("?")[1] || "";
    const signed = queryHmacValid(req.query, app.secret, rawQuery);

    const tokenResp = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: app.clientId,
        client_secret: app.secret,
        code,
        // Shopify no longer accepts tokens that never expire: this one
        // lasts about an hour and comes with a refresh token
        // (utils/shopifyToken.js renews it)
        expiring: 1,
      }),
    });
    const tokenBody = await tokenResp.json().catch(() => ({}));
    const { access_token } = tokenBody;
    if (!access_token) {
      console.error(
        `Shopify callback for ${shop} (${appKey} app): code exchange rejected (${tokenResp.status}), signature ${signed ? "valid" : "invalid"}`,
      );
      return res.status(403).send("Shopify didn't confirm this install — start again");
    }
    if (!signed) {
      console.warn(
        `Shopify callback for ${shop}: signature didn't match the ${appKey} app's secret, but Shopify accepted the code — finish any pending secret rotation in the Shopify dashboard`,
      );
    }

    // The store's name and public domain (GraphQL — new public apps are
    // expected to use it rather than REST)
    const shopResp = await fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": access_token },
      body: JSON.stringify({ query: "{ shop { name primaryDomain { host } } }" }),
    });
    const shopBody = await shopResp.json().catch(() => ({}));
    const shopInfo = shopBody.data?.shop;
    if (!shopInfo?.name) {
      console.error(
        `Shopify callback for ${shop}: couldn't read the store details (${shopResp.status}):`,
        JSON.stringify(shopBody.errors || shopBody).slice(0, 500),
      );
      return res.redirect(`${process.env.FRONTEND_URL}/onboarding?error=connect_failed`);
    }
    const shopData = { name: shopInfo.name, domain: shopInfo.primaryDomain?.host || shop };

    let store = await Store.findOne({ where: { shopify_domain: shop } });

    if (!store) {
      const subdomain = await generateSubdomain(shopData.name);
      store = await Store.create({
        name: shopData.name,
        shopify_domain: shop,
        storefront_url: `https://${shopData.domain}`,
        ...tokenFields(tokenBody),
        shopify_app: appKey,
        subdomain,
        status: "pending",
        onboarding_step: "account",
      });
    } else {
      // Reconnected — possibly moving to the other app
      await store.update({ ...tokenFields(tokenBody), shopify_app: appKey });
      // Reinstalled after an uninstall. Shopify cancelled their
      // subscription on uninstall, so paying stores pick their plan again
      // (no second trial); the flagship store goes straight back online.
      if (store.uninstalled_at) {
        const exempt = await isBillingExempt(store);
        const finished = store.onboarding_step === "complete";
        await store.update({
          uninstalled_at: null,
          ...(finished && exempt
            ? { status: "active" }
            : { status: "pending", onboarding_step: finished ? "plan" : store.onboarding_step }),
        });
      }
    }

    await registerShopifyWebhooks(store);
    await activateWebPixel(store, access_token, shop);
    await backfillInventory(store);
    const onboardingToken = signOnboardingToken(store.id);

    res.clearCookie("shopify_oauth_state");
    res.clearCookie("shopify_oauth_app");
    // Reconnecting a live store just goes to the dashboard (login if needed)
    if (store.onboarding_step === "complete") {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    }
    // Unfinished: back into setup, which resumes at the saved step
    return res.redirect(
      `${process.env.FRONTEND_URL}/onboarding/setup?onboarding_token=${onboardingToken}`,
    );
  } catch (error) {
    console.error("Shopify callback error:", error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/onboarding?error=connect_failed`,
    );
  }
};

const checkDomain = async (req, res) => {
  try {
    const { shop } = req.body;
    if (!shop || !shop.endsWith(".myshopify.com")) {
      return res
        .status(400)
        .json({ success: false, message: "Valid shop domain required" });
    }

    const store = await Store.findOne({ where: { shopify_domain: shop } });
    if (!store && !(await canConnect(shop))) {
      return res.status(403).json({ success: false, message: BETA_CLOSED_MESSAGE });
    }

    return res.status(200).json({
      success: true,
      data: { exists: !!store, subdomain: store?.subdomain || null },
    });
  } catch (error) {
    console.error("Check domain error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to check domain" });
  }
};

const updateSubdomain = async (req, res) => {
  try {
    const { subdomain } = req.body;
    if (!req.store) {
      return res
        .status(400)
        .json({ success: false, message: "Store not resolved" });
    }

    if (req.store.status !== "pending") {
      return res.status(403).json({
        success: false,
        message: "Subdomain can only be changed during onboarding",
      });
    }

    const cleaned = (subdomain || "").toLowerCase().trim();

    if (!isValidSubdomainFormat(cleaned)) {
      return res.status(400).json({
        success: false,
        message:
          "Subdomain must be 3-30 characters, lowercase letters/numbers/hyphens only",
      });
    }

    const existing = await Store.findOne({ where: { subdomain: cleaned } });
    if (existing && existing.id !== req.store.id) {
      return res
        .status(409)
        .json({ success: false, message: "That subdomain is already taken" });
    }

    await req.store.update({
      subdomain: cleaned,
      onboarding_step: req.store.onboarding_step === "subdomain" ? "plan" : req.store.onboarding_step,
    });

    return res
      .status(200)
      .json({ success: true, data: { subdomain: req.store.subdomain } });
  } catch (error) {
    console.error("Update subdomain error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update subdomain" });
  }
};

// GET /api/store/onboarding — where this merchant is in setup
const getOnboarding = async (req, res) => {
  const { store } = req;
  return res.status(200).json({
    success: true,
    data: {
      step: store.onboarding_step,
      logged_in: !!req.account,
      store_name: store.name,
      subdomain: store.subdomain,
      shopify_domain: store.shopify_domain,
    },
  });
};

// PUT /api/store/plan — the last onboarding step. The flagship store
// (billing-exempt) goes live straight away. Everyone else gets a Shopify
// subscription to approve: the reply has confirmation_url, the browser
// goes there, and the store goes live in billingCallback once Shopify
// confirms it's active.
const selectPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!["pro"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }
    if (!req.store) {
      return res
        .status(400)
        .json({ success: false, message: "Store not resolved" });
    }

    if (await isBillingExempt(req.store)) {
      await req.store.update({
        plan: "internal",
        billing_status: "exempt",
        sms_enabled: true,
        onboarding_step: "complete",
        status: "active",
      });
      return res.status(200).json({
        success: true,
        data: { plan: req.store.plan, status: req.store.status, confirmation_url: null },
      });
    }

    const { confirmationUrl, subscriptionId } = await createSubscription(req.store);
    await req.store.update({ shopify_subscription_id: subscriptionId, billing_status: "pending" });
    return res.status(200).json({
      success: true,
      data: { plan: "pro", status: req.store.status, confirmation_url: confirmationUrl },
    });
  } catch (error) {
    console.error("Select plan error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Couldn't start billing with Shopify. Try again." });
  }
};

// GET /api/store/billing/callback?store=<id> — Shopify sends the merchant
// here after they approve or decline. The result is read from Shopify,
// not from this link, so visiting it by hand changes nothing.
const billingCallback = async (req, res) => {
  const setupUrl = (reason) => `${process.env.FRONTEND_URL}/onboarding/setup?billing=${reason}`;
  try {
    const store = /^[0-9a-f-]{36}$/i.test(req.query.store || "")
      ? await Store.findByPk(req.query.store)
      : null;
    if (!store?.shopify_subscription_id) return res.redirect(setupUrl("error"));

    const status = await subscriptionStatus(store, store.shopify_subscription_id);
    if (status !== "ACTIVE") {
      await store.update({ billing_status: (status || "declined").toLowerCase() });
      return res.redirect(setupUrl("declined"));
    }

    await store.update({
      plan: "pro",
      billing_status: "active",
      billing_started_at: store.billing_started_at || new Date(),
      sms_enabled: true,
      onboarding_step: "complete",
      status: "active",
    });
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error("Billing callback error:", error.message);
    return res.redirect(setupUrl("error"));
  }
};

const getStore = async (req, res) => {
  if (!req.store) {
    return res
      .status(400)
      .json({ success: false, message: "Store not resolved" });
  }
  return res.status(200).json({
    success: true,
    data: {
      id: req.store.id,
      name: req.store.name,
      subdomain: req.store.subdomain,
      plan: req.store.plan,
      status: req.store.status,
      // Branding + categories for the shopper site
      logo_url: logoUrl(req.store),
      brand_color: req.store.brand_color || null,
      brand_text_color: req.store.brand_color ? textOnColor(req.store.brand_color) : null,
      enabled_categories: enabledCategories(req.store),
      // Whether shoppers can add a phone for text alerts right now
      sms_available: smsAvailable(req.store),
    },
  });
};

// GET /api/store/shopify/app — the app's address in Shopify. Shopify
// sends merchants here (signed) when they install SyncStock from the App
// Store or open it from their admin. Installing starts the connection
// straight away (no typing a store address); opening an already
// connected store goes to the merchant dashboard. Installs that come
// signed through Shopify skip the private-beta gate: until Shopify
// approves the public app only development stores can install it, which
// is how Shopify's reviewers test it.
const shopifyAppEntry = async (req, res) => {
  try {
    const shop = String(req.query.shop || "").toLowerCase();
    if (!isShopDomain(shop)) return res.redirect(process.env.FRONTEND_URL);
    const store = await Store.findOne({ where: { shopify_domain: shop } });

    // A link Shopify signed skips the private beta (it's an install from
    // Shopify). One that doesn't verify is treated like the Connect page:
    // beta rules apply, and the install itself is still confirmed by
    // Shopify in the callback. Nothing here grants access on its own.
    let appKey = appThatSignedQuery(req.query, req.originalUrl.split("?")[1] || "");
    if (!appKey) {
      console.warn(`Shopify app link for ${shop} didn't match either app's secret — handling it as a normal connect`);
      if (!(await canConnect(shop))) {
        return res.redirect(`${process.env.FRONTEND_URL}/onboarding?error=beta`);
      }
      appKey = appForConnect(undefined, store);
    }

    const connected = store && store.shopify_app === appKey && !store.uninstalled_at;
    if (!connected) return startOAuth(res, shop, appKey);

    return res.redirect(
      store.onboarding_step === "complete"
        ? `${process.env.FRONTEND_URL}/dashboard`
        : `${process.env.FRONTEND_URL}/login?redirect=${encodeURIComponent("/onboarding/setup")}`,
    );
  } catch (error) {
    console.error("Shopify app entry error:", error.message);
    return res.redirect(process.env.FRONTEND_URL);
  }
};

// GET /api/store/shopify/status — which Shopify apps this server has keys
// for, to check the Railway variables. Never shows a secret: just whether
// each is set, the last 4 characters of the client ID, and a 6-character
// fingerprint of the secret to compare against the Partner dashboard.
const shopifyAppsStatus = (req, res) => {
  const fingerprint = (secret) =>
    secret ? crypto.createHash("sha256").update(secret).digest("hex").slice(0, 6) : null;
  const describe = (key) => {
    const app = APPS[key];
    const id = app.clientId();
    const secret = app.secret();
    return {
      configured: isConfigured(key),
      client_id_ends_with: id ? id.slice(-4) : null,
      secret_set: !!secret,
      secret_length: secret ? secret.length : 0,
      secret_fingerprint: fingerprint(secret),
    };
  };
  res.status(200).json({ custom: describe("custom"), public: describe("public") });
};

// GET /api/store/go?shop=x.myshopify.com&src=banner|floating — the
// "Restock alerts" blocks on a merchant's own Shopify site link here.
// Finds the store from its Shopify domain (so the blocks need no setup),
// counts the click, remembers where the shopper came from for 30 days
// (so a signup is credited to the website), and opens the store's
// SyncStock site. Unknown or offline stores go to syncstock.io.
const goToStore = async (req, res) => {
  try {
    const shop = String(req.query.shop || "").toLowerCase();
    const store = shop.endsWith(".myshopify.com")
      ? await Store.findOne({ where: { shopify_domain: shop } })
      : null;
    if (!store || store.status !== "active") return res.redirect(process.env.FRONTEND_URL);

    const source = `shopify_${req.query.src}`;
    if (SOURCES.includes(source)) {
      res.cookie(REF_COOKIE, source, refCookieOptions());
      await store.increment("widget_clicks");
    }
    return res.redirect(`${storeBaseUrl(store)}/`);
  } catch (error) {
    console.error("Store go-link error:", error.message);
    return res.redirect(process.env.FRONTEND_URL);
  }
};

// GET /api/store/mine — the logged-in merchant's own store, found from
// their login rather than the web address (the merchant dashboard runs on
// syncstock.io, which has no store subdomain for GET /store to read)
const getMyStore = (req, res) =>
  res.status(200).json({
    success: true,
    data: {
      id: req.store.id,
      name: req.store.name,
      subdomain: req.store.subdomain,
      plan: req.store.plan,
      status: req.store.status,
      billing_status: req.store.billing_status,
    },
  });

// Lists customers (role: "user", never the admin themselves) with
// optional search by email or name
const getCustomers = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { q } = req.query;

    const accountWhere = q
      ? {
          [Op.or]: [
            { email: { [Op.iLike]: `%${q}%` } },
            { full_name: { [Op.iLike]: `%${q}%` } },
          ],
        }
      : undefined;

    const { count, rows } = await User.findAndCountAll({
      where: { store_id: req.store.id, role: "user" },
      include: [{ model: Account, where: accountWhere, required: true }],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    const data = rows.map((membership) => ({
      id: membership.id,
      email: membership.Account.email,
      full_name: membership.Account.full_name,
      notify_email: membership.notify_email,
      notify_inapp: membership.notify_inapp,
      joined_at: membership.created_at,
    }));

    return res
      .status(200)
      .json({ success: true, data, meta: buildMeta(count, page, limit) });
  } catch (error) {
    console.error("Get customers error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch customers" });
  }
};

// Admin removing a customer's membership — never the admin's own.
const removeCustomer = async (req, res) => {
  try {
    const membership = await User.findOne({
      where: { id: req.params.id, store_id: req.store.id },
    });

    if (!membership) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    if (membership.account_id === req.account.id) {
      return res.status(400).json({
        success: false,
        message:
          "You can't remove yourself this way — use account settings instead",
      });
    }

    await membership.destroy();

    return res.status(200).json({ success: true, message: "Customer removed" });
  } catch (error) {
    console.error("Remove customer error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove customer" });
  }
};

module.exports = {
  shopifyAppsStatus,
  shopifyAppEntry,
  goToStore,
  billingCallback,
  getMyStore,
  initiateShopifyConnect,
  handleShopifyCallback,
  checkDomain,
  updateSubdomain,
  selectPlan,
  getOnboarding,
  getStore,
  getCustomers,
  removeCustomer,
};
