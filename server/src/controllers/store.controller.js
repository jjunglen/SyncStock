const crypto = require("crypto");
const { Store } = require("../models/index.js");

const RESERVED_SUBDOMAINS = [
  "www",
  "api",
  "app",
  "admin",
  "mail",
  "syncstock",
  "store",
];

// Converts a name into a URL-safe slug
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Auto-generates a subdomain, resolving collisions with a number suffix
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

// Validates a subdomain a merchant chooses manually
const isValidSubdomainFormat = (value) => {
  if (!value || value.length < 3 || value.length > 30) return false;
  if (!/^[a-z0-9-]+$/.test(value)) return false;
  if (value.startsWith("-") || value.endsWith("-")) return false;
  if (RESERVED_SUBDOMAINS.includes(value)) return false;
  return true;
};

// Registers the four webhooks this app needs on a newly connected store
const registerShopifyWebhooks = async (store, accessToken, shop) => {
  const topics = [
    "products/create",
    "products/update",
    "products/delete",
    "orders/create",
  ];

  for (const topic of topics) {
    await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address: `${process.env.BACKEND_URL}/api/webhooks/shopify/${topic.replace("/", "/")}`,
          format: "json",
        },
      }),
    }).catch((err) =>
      console.error(`Failed to register ${topic} webhook:`, err.message),
    );
  }
};

// Redirects a merchant to Shopify's install/authorize screen
const initiateShopifyConnect = (req, res) => {
  const { shop } = req.query;
  if (!shop || !shop.endsWith(".myshopify.com")) {
    return res
      .status(400)
      .json({ success: false, message: "Valid shop domain required" });
  }

  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("shopify_oauth_state", state, {
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const redirectUri = `${process.env.BACKEND_URL}/api/store/shopify/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_APP_CLIENT_ID}&scope=${process.env.SHOPIFY_APP_SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return res.redirect(installUrl);
};

// Shopify redirects here after the merchant approves the install
const handleShopifyCallback = async (req, res) => {
  try {
    const { shop, code, state, hmac } = req.query;

    if (req.cookies.shopify_oauth_state !== state) {
      return res.status(403).send("Invalid state — possible CSRF attempt");
    }

    const params = { ...req.query };
    delete params.hmac;
    delete params.signature;
    const message = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_APP_CLIENT_SECRET)
      .update(message)
      .digest("hex");
    if (generatedHmac !== hmac) {
      return res.status(403).send("HMAC validation failed");
    }

    const tokenResp = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_APP_CLIENT_ID,
        client_secret: process.env.SHOPIFY_APP_CLIENT_SECRET,
        code,
      }),
    });
    const { access_token } = await tokenResp.json();

    const shopResp = await fetch(
      `https://${shop}/admin/api/2025-01/shop.json`,
      {
        headers: { "X-Shopify-Access-Token": access_token },
      },
    );
    const { shop: shopData } = await shopResp.json();

    let store = await Store.findOne({ where: { shopify_domain: shop } });

    if (!store) {
      const subdomain = await generateSubdomain(shopData.name);
      store = await Store.create({
        name: shopData.name,
        shopify_domain: shop,
        storefront_url: `https://${shopData.domain}`,
        shopify_access_token: access_token,
        subdomain,
        status: "pending",
      });
    } else {
      await store.update({ shopify_access_token: access_token });
    }

    await registerShopifyWebhooks(store, access_token, shop);

    res.clearCookie("shopify_oauth_state");
    return res.redirect(
      `${process.env.FRONTEND_URL}/onboarding/subdomain?store=${store.subdomain}`,
    );
  } catch (error) {
    console.error("Shopify callback error:", error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/onboarding?error=connect_failed`,
    );
  }
};

// Lets a merchant override the auto-generated subdomain during onboarding
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

    await req.store.update({ subdomain: cleaned });

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

// Merchant picks a plan — final onboarding step, flips status to active
const selectPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!["free", "starter", "pro"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }
    if (!req.store) {
      return res
        .status(400)
        .json({ success: false, message: "Store not resolved" });
    }

    await req.store.update({ plan, status: "active" });

    return res.status(200).json({
      success: true,
      data: { plan: req.store.plan, status: req.store.status },
    });
  } catch (error) {
    console.error("Select plan error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to set plan" });
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
    },
  });
};

module.exports = {
  initiateShopifyConnect,
  handleShopifyCallback,
  updateSubdomain,
  selectPlan,
  getStore,
};
