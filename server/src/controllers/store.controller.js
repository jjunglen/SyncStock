const crypto = require("crypto");
const { Store, Inventory } = require("../models/index.js");
const { parseVariantTitle } = require("../utils/parseVariantTitle.js");

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
          address: `${process.env.BACKEND_URL}/api/webhooks/shopify/${topic}`,
          format: "json",
        },
      }),
    }).catch((err) =>
      console.error(`Failed to register ${topic} webhook:`, err.message),
    );
  }
};

// Pulls a store's existing Shopify catalog at connect-time, following
// Shopify's Link header to walk every page rather than just the first
// 250 products
const backfillInventory = async (store, accessToken, shop) => {
  try {
    let url = `https://${shop}/admin/api/2025-01/products.json?limit=250`;
    let totalSynced = 0;
    let pageCount = 0;
    const MAX_PAGES = 50; // safety cap — 12,500 products, generous ceiling

    while (url && pageCount < MAX_PAGES) {
      const response = await fetch(url, {
        headers: { "X-Shopify-Access-Token": accessToken },
      });
      const { products } = await response.json();

      for (const product of products) {
        for (const variant of product.variants || []) {
          const { size, condition, boxCondition } = parseVariantTitle(
            variant.title,
            product.handle,
          );

          await Inventory.upsert({
            store_id: store.id,
            shopify_product_id: String(product.id),
            shopify_variant_id: String(variant.id),
            category: "sneakers",
            product_name: product.title,
            sku: variant.sku || null,
            size,
            condition,
            box_status: boxCondition,
            price: parseFloat(variant.price) || null,
            available: variant.inventory_quantity || 0,
            shopify_url: `${store.storefront_url}/products/${product.handle}`,
            image_url: product.images?.[0]?.src || null,
            last_synced_at: new Date(),
          });
        }
      }

      totalSynced += products.length;
      pageCount++;

      const linkHeader = response.headers.get("link");
      const nextMatch =
        linkHeader && linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1] : null;
    }

    if (pageCount >= MAX_PAGES) {
      console.warn(
        `Backfill hit MAX_PAGES safety cap for store ${store.id} — may be incomplete`,
      );
    }

    console.log(`Backfilled ${totalSynced} products for store ${store.id}`);
  } catch (error) {
    console.error("Backfill inventory error:", error.message);
  }
};

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
    await backfillInventory(store, access_token, shop);

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

    await req.store.update({
      plan,
      status: "active",
      sms_enabled: plan === "pro",
    });

    return res.status(200).json({
      success: true,
      data: {
        plan: req.store.plan,
        status: req.store.status,
        sms_enabled: req.store.sms_enabled,
      },
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
