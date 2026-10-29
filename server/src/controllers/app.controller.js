const { shopperVisible } = require("../services/channel.service.js");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { Account, User, Store, Inventory, DeviceToken } = require("../models/index.js");
const {
  signToken,
  signAppHandoffToken,
  verifyAppHandoffToken,
} = require("../utils/jwt.js");
const { issuedBeforeCutoff, setSessionCookie } = require("../utils/session.js");
const { verifyAppleIdentityToken } = require("../utils/appleSignIn.js");
const { enabledCategories, logoUrl } = require("../utils/storeSettings.js");
const { storeBaseUrl, safeRedirectPath } = require("../utils/storeUrl.js");
const { ensureMembership } = require("./auth.controller.js");
const { isValidSize } = require("../utils/validate.js");

// The SyncStock phone app (Capacitor). The app itself only shows the
// store list and the profile; each store opens as that store's own site
// (<sub>.syncstock.io) inside the app, signed in through openStore.

const APP_SOURCE = "app"; // users.signup_source for shoppers who joined in the app

// The login the app keeps (sent as a Bearer token on /api/app requests)
const appToken = (account) => signToken(account, { via: "app" });

const accountJson = (account) => ({
  id: account.id,
  email: account.email,
  full_name: account.full_name,
  sizes: account.sizes || [],
  needs_sizes: !account.sizes || account.sizes.length === 0,
});

const signedIn = (res, account) =>
  res.status(200).json({
    success: true,
    data: { token: appToken(account), account: accountJson(account) },
  });

// POST /api/app/auth/login { email, password }
const login = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    const account = await Account.findOne({ where: { email } });
    const valid = account?.password && (await bcrypt.compare(password, account.password));
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    if (!account.email_verified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "You need to verify your email using the link sent to your email.",
      });
    }
    return signedIn(res, account);
  } catch (error) {
    console.error("App login error:", error.message);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

// POST /api/app/auth/apple { identity_token, full_name? }
// Apple sends the name only on the very first sign-in, so the app
// passes it along when it has it.
const appleSignIn = async (req, res) => {
  try {
    const claims = await verifyAppleIdentityToken(req.body.identity_token);
    if (!claims) {
      return res.status(401).json({ success: false, message: "Apple sign-in couldn't be verified" });
    }
    const email = claims.email ? String(claims.email).toLowerCase() : null;
    const emailVerified = claims.email_verified === true || claims.email_verified === "true";
    const fullName = String(req.body.full_name || "").trim().slice(0, 100) || null;

    // Returning Apple user → existing account with the same (Apple-
    // verified) email, which gets Apple linked → a new account
    let account = await Account.findOne({ where: { apple_sub: claims.sub } });
    if (!account && email && emailVerified) {
      account = await Account.findOne({ where: { email } });
      if (account) {
        await account.update({
          apple_sub: claims.sub,
          email_verified: true,
          ...(!account.full_name && fullName && { full_name: fullName }),
        });
      }
    }
    if (!account) {
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Apple didn't share an email. Remove SyncStock under Settings → Apple ID → Sign in with Apple, then try again.",
        });
      }
      account = await Account.create({
        email,
        apple_sub: claims.sub,
        email_verified: true,
        full_name: fullName,
      });
    }
    return signedIn(res, account);
  } catch (error) {
    console.error("Apple sign-in error:", error.message);
    return res.status(500).json({ success: false, message: "Apple sign-in failed" });
  }
};

// GET /api/app/me — also hands back a fresh token, so an app that's
// opened now and then never reaches the 60-day expiry
const me = (req, res) => signedIn(res, req.account);

// PUT /api/app/me/sizes { sizes: ["10", "10.5"] } — first-run size picker
const updateSizes = async (req, res) => {
  try {
    const { sizes } = req.body;
    if (!Array.isArray(sizes) || sizes.length > 60 || !sizes.every(isValidSize)) {
      return res.status(400).json({ success: false, message: "Pick your sizes from the list" });
    }
    await req.account.update({ sizes: [...new Set(sizes)] });
    return res.status(200).json({ success: true, data: accountJson(req.account) });
  } catch (error) {
    console.error("App sizes error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to save sizes" });
  }
};

// Live stores only — a store that's been uninstalled or isn't finished
// setting up can't be opened
const LIVE = { status: "active", uninstalled_at: null };

// How many products (not sizes) the store has in stock in the shopper's
// sizes, using the same rules as the store site's "In your size"
const inYourSizes = async (store, sizes) => {
  if (!sizes || sizes.length === 0) return 0;
  return Inventory.count({
    where: {
      store_id: store.id,
      ...shopperVisible(store),
      available: { [Op.gt]: 0 },
      image_url: { [Op.ne]: null },
      category: { [Op.in]: enabledCategories(store).filter((c) => c !== "trading_cards") },
      size: { [Op.in]: sizes },
    },
    distinct: true,
    col: "shopify_product_id",
  });
};

const storeCard = async (store, account, following) => ({
  subdomain: store.subdomain,
  name: store.name,
  logo_url: logoUrl(store),
  brand_color: store.brand_color || null,
  categories: enabledCategories(store),
  in_your_sizes: await inYourSizes(store, account.sizes),
  following,
});

// GET /api/app/stores?q=
// { yours: stores the shopper belongs to, discover: other stores that
// listed themselves in the app }. A store the shopper already joined on
// the web shows under "yours" even if it isn't listed.
const listStores = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 50);
    const nameMatch = q ? { name: { [Op.iLike]: `%${q.replace(/[%_\\]/g, "\\$&")}%` } } : {};

    const memberships = await User.findAll({
      where: { account_id: req.account.id },
      attributes: ["store_id"],
    });
    const memberOf = memberships.map((m) => m.store_id);

    const [yours, discover] = await Promise.all([
      memberOf.length
        ? Store.findAll({ where: { ...LIVE, ...nameMatch, id: { [Op.in]: memberOf } }, order: [["name", "ASC"]] })
        : [],
      Store.findAll({
        where: {
          ...LIVE,
          ...nameMatch,
          app_listed: true,
          ...(memberOf.length && { id: { [Op.notIn]: memberOf } }),
        },
        order: [["name", "ASC"]],
        limit: 50,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        yours: await Promise.all(yours.map((s) => storeCard(s, req.account, true))),
        discover: await Promise.all(discover.map((s) => storeCard(s, req.account, false))),
      },
    });
  } catch (error) {
    console.error("App store list error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load stores" });
  }
};

// The store named in the URL, if the shopper may open it: listed in the
// app, or one they already belong to
const findOpenableStore = async (req) => {
  const store = await Store.findOne({ where: { ...LIVE, subdomain: String(req.params.subdomain || "") } });
  if (!store) return null;
  if (store.app_listed) return store;
  const member = await User.count({ where: { account_id: req.account.id, store_id: store.id } });
  return member ? store : null;
};

const STORE_NOT_FOUND = { success: false, message: "Store not found" };

// POST /api/app/stores/:subdomain/follow — joins the store (the same
// membership as signing up on its site), so it's under "Your stores" and
// size alerts can reach the shopper
const followStore = async (req, res) => {
  try {
    const store = await findOpenableStore(req);
    if (!store) return res.status(404).json(STORE_NOT_FOUND);
    await ensureMembership(req.account, store, APP_SOURCE);
    return res.status(200).json({ success: true, data: await storeCard(store, req.account, true) });
  } catch (error) {
    console.error("App follow error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to follow store" });
  }
};

// DELETE /api/app/stores/:subdomain/follow — leaves the store. Like
// "Remove me from this store" on the site, this also removes the
// shopper's alerts there (the app asks first). A store's owner can't.
const unfollowStore = async (req, res) => {
  try {
    const store = await Store.findOne({ where: { subdomain: String(req.params.subdomain || "") } });
    const membership = store
      ? await User.findOne({ where: { account_id: req.account.id, store_id: store.id } })
      : null;
    if (!membership) return res.status(404).json(STORE_NOT_FOUND);
    if (membership.role === "admin") {
      return res.status(400).json({ success: false, message: "You own this store, so you can't leave it" });
    }
    await membership.destroy();
    return res.status(200).json({ success: true, message: `You left ${store.name}` });
  } catch (error) {
    console.error("App unfollow error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to leave store" });
  }
};

// POST /api/app/stores/:subdomain/open { to?: "/store/dashboard?item=…" }
// → { url }: a one-time link the app loads to show the store, already
// signed in. Opening a store joins it, like signing up on its site.
const openStore = async (req, res) => {
  try {
    const store = await findOpenableStore(req);
    if (!store) return res.status(404).json(STORE_NOT_FOUND);
    await ensureMembership(req.account, store, APP_SOURCE);

    const url = new URL(`${process.env.BACKEND_URL}/api/app/enter`);
    url.searchParams.set("t", signAppHandoffToken(req.account.id, store.id));
    const to = safeRedirectPath(req.body?.to);
    if (to) url.searchParams.set("to", to);
    return res.status(200).json({ success: true, data: { url: url.toString() } });
  } catch (error) {
    console.error("App open store error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to open store" });
  }
};

// One-time links already used, until they'd have expired anyway (2 min).
// In memory — the API runs as a single server.
const usedHandoffs = new Map();
const markUsed = (jti, expSeconds) => {
  const now = Date.now();
  for (const [id, exp] of usedHandoffs) if (exp < now) usedHandoffs.delete(id);
  if (usedHandoffs.has(jti)) return false;
  usedHandoffs.set(jti, expSeconds * 1000);
  return true;
};

// GET /api/app/enter?t=…&to=… — loaded inside the app. Sets the store
// site's normal login cookie, then goes to the store.
const enterStore = async (req, res) => {
  try {
    const link = verifyAppHandoffToken(req.query.t);
    const store = link ? await Store.findByPk(link.store_id) : null;
    if (!link || !store || !link.jti || !markUsed(link.jti, link.exp)) {
      return res.redirect(store ? storeBaseUrl(store) : process.env.FRONTEND_URL);
    }
    const destination = `${storeBaseUrl(store)}${safeRedirectPath(req.query.to) || "/store/dashboard"}`;

    const account = await Account.findByPk(link.id);
    const membership = account
      ? await User.findOne({ where: { account_id: account.id, store_id: store.id } })
      : null;
    if (!account || issuedBeforeCutoff(link, account) || !membership) {
      return res.redirect(destination);
    }
    setSessionCookie(res, signToken(account));
    return res.redirect(destination);
  } catch (error) {
    console.error("App enter error:", error.message);
    return res.redirect(process.env.FRONTEND_URL);
  }
};

// POST /api/app/devices { token, platform } — the phone's Firebase token,
// sent after the shopper allows notifications. A token moves to whoever
// signed in on that phone last.
const registerDevice = async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const platform = req.body.platform;
    if (!token || token.length > 4096 || !["ios", "android"].includes(platform)) {
      return res.status(400).json({ success: false, message: "Invalid device" });
    }
    const existing = await DeviceToken.findOne({ where: { token } });
    if (existing) await existing.update({ account_id: req.account.id, platform });
    else await DeviceToken.create({ account_id: req.account.id, token, platform });
    return res.status(204).end();
  } catch (error) {
    console.error("App device register error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to turn on notifications" });
  }
};

// DELETE /api/app/devices { token } — sign-out, or notifications off
const unregisterDevice = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (token) await DeviceToken.destroy({ where: { token, account_id: req.account.id } });
    return res.status(204).end();
  } catch (error) {
    console.error("App device unregister error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to turn off notifications" });
  }
};

module.exports = {
  login,
  appleSignIn,
  me,
  updateSizes,
  listStores,
  followStore,
  unfollowStore,
  openStore,
  enterStore,
  registerDevice,
  unregisterDevice,
};
