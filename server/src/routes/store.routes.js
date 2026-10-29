const express = require("express");
const router = express.Router();
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const {
  resolveStoreFromSubdomain,
  resolveOnboardingStore,
  requireOnboardingOwner,
  resolveStoreFromAdminMembership,
} = require("../middleware/tenant.middleware.js");
const {
  initiateShopifyConnect,
  handleShopifyCallback,
  checkDomain,
  updateSubdomain,
  selectPlan,
  getOnboarding,
  getStore,
  getCustomers,
  removeCustomer,
  getMyStore,
  billingCallback,
  goToStore,
  scanInStore,
  shopifyAppEntry,
  shopifyAppsStatus,
  reauthorizeShopify,
} = require("../controllers/store.controller.js");
const {
  requireShopifyStore,
  getChannel,
  connectChannel,
  disconnectChannel,
} = require("../controllers/channel.controller.js");
const {
  getSettings,
  updateSettings,
  uploadLogo,
  deleteLogo,
  serveLogo,
  previewStory,
  sendTestStories,
} = require("../controllers/storeSettings.controller.js");

const admin = [authenticateAccount, resolveStoreFromAdminMembership];

// No store resolution on these — nothing exists yet to resolve.
router.post("/check-domain", checkDomain);
router.get("/shopify/connect", initiateShopifyConnect);
router.get("/shopify/callback", handleShopifyCallback);
// The app's address in Shopify: installs and "open app" land here
// (and any page under it — Shopify forwards admin paths like /onboarding/setup)
router.get(/^\/shopify\/app(\/[a-zA-Z0-9/_-]*)?$/, shopifyAppEntry);
// Opened in the whole window to re-ask Shopify for permissions the app
// now needs (the channel page sends merchants here)
router.get("/shopify/reauthorize", reauthorizeShopify);
// The sales channel page inside the Shopify admin (Shopify session only)
router.get("/channel", requireShopifyStore, getChannel);
router.post("/channel/connect", requireShopifyStore, connectChannel);
router.post("/channel/disconnect", requireShopifyStore, disconnectChannel);
// Which app keys the server has (no secrets) — for checking Railway
router.get("/shopify/status", shopifyAppsStatus);

// Merchant onboarding: Shopify → account → subdomain → plan. Progress is
// saved on the store (onboarding_step). Where they are can be read with
// the setup link or their login; the steps after the account need the
// logged-in owner, so they can leave and pick up where they left off.
router.get("/onboarding", resolveOnboardingStore, getOnboarding);
router.put("/subdomain", requireOnboardingOwner, updateSubdomain);
router.put("/plan", requireOnboardingOwner, selectPlan);
// Shopify sends merchants back here after approving billing
router.get("/billing/callback", billingCallback);
// The "Restock alerts" blocks on merchants' own Shopify sites link here
router.get("/go", goToStore);
// The in-store QR sign links here
router.get("/qr/:subdomain", scanInStore);

router.get("/", resolveStoreFromSubdomain, getStore);

// Store settings (merchant): categories shown, branding, weekly email.
// The logo is sent as the raw image file (the app-wide JSON parser
// ignores image bodies), capped a little above the 300 KB limit so the
// controller can explain the limit itself.
router.get("/mine", ...admin, getMyStore);
router.get("/settings", ...admin, getSettings);
router.put("/settings", ...admin, updateSettings);
router.put("/logo", ...admin, express.raw({ type: "image/*", limit: "400kb" }), uploadLogo);
router.delete("/logo", ...admin, deleteLogo);
router.get("/logo/:id", serveLogo);
// New-arrival Instagram stories (stories.service.js)
router.get("/stories/preview", ...admin, previewStory);
router.post("/stories/test", ...admin, sendTestStories);

router.get("/customers", authenticateAccount, resolveStoreFromAdminMembership, getCustomers);
router.delete("/customers/:id", authenticateAccount, resolveStoreFromAdminMembership, removeCustomer);

module.exports = router;