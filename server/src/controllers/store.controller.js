const crypto = require("crypto");
const { Op } = require("sequelize");
const { Store, Inventory, User, Account } = require("../models/index.js");
const { parseVariantTitle } = require("../utils/parseVariantTitle.js");
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

const registerShopifyWebhooks = async (store, accessToken, shop) => {
  const topics = [
    "products/create",
    "products/update",
    "products/delete",
    "orders/create",
  ];

  const existingResp = await fetch(
    `https://${shop}/admin/api/2025-01/webhooks.json`,
    {
      headers: { "X-Shopify-Access-Token": accessToken },
    },
  ).catch((err) => {
    console.error("Failed to fetch existing webhooks:", err.message);
    return null;
  });

  const existingTopics = new Set();
  if (existingResp && existingResp.ok) {
    const { webhooks } = await existingResp.json();
    const ourAddress = (topic) =>
      `${process.env.BACKEND_URL}/api/webhooks/shopify/${topic}`;
    for (const webhook of webhooks || []) {
      if (webhook.address === ourAddress(webhook.topic)) {
        existingTopics.add(webhook.topic);
      }
    }
  }

  for (const topic of topics) {
    if (existingTopics.has(topic)) {
      console.log(`Webhook already registered, skipping: ${topic}`);
      continue;
    }

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

const backfillInventory = async (store, accessToken, shop) => {
  try {
    let url = `https://${shop}/admin/api/2025-01/products.json?limit=250`;
    let totalSynced = 0;
    let pageCount = 0;
    const MAX_PAGES = 50;

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
    const onboardingToken = signOnboardingToken(store.id);

    res.clearCookie("shopify_oauth_state");
    return res.redirect(
      `${process.env.FRONTEND_URL}/onboarding/subdomain?store=${store.subdomain}&onboarding_token=${onboardingToken}`,
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

    await req.store.update({ plan, sms_enabled: plan === "pro" });

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
  initiateShopifyConnect,
  handleShopifyCallback,
  checkDomain,
  updateSubdomain,
  selectPlan,
  getStore,
  getCustomers,
  removeCustomer,
};
