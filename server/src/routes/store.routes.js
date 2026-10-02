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
  shopifyAppEntry,
} = require("../controllers/store.controller.js");
const {
  getSettings,
  updateSettings,
  uploadLogo,
  deleteLogo,
  serveLogo,
} = require("../controllers/storeSettings.controller.js");

const admin = [authenticateAccount, resolveStoreFromAdminMembership];

// No store resolution on these — nothing exists yet to resolve.
router.post("/check-domain", checkDomain);
router.get("/shopify/connect", initiateShopifyConnect);
router.get("/shopify/callback", handleShopifyCallback);
// The app's address in Shopify: installs and "open app" land here
router.get("/shopify/app", shopifyAppEntry);

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

router.get("/customers", authenticateAccount, resolveStoreFromAdminMembership, getCustomers);
router.delete("/customers/:id", authenticateAccount, resolveStoreFromAdminMembership, removeCustomer);

module.exports = router;