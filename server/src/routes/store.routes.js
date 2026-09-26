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
} = require("../controllers/store.controller.js");

// No store resolution on these — nothing exists yet to resolve.
router.post("/check-domain", checkDomain);
router.get("/shopify/connect", initiateShopifyConnect);
router.get("/shopify/callback", handleShopifyCallback);

// Merchant onboarding: Shopify → account → subdomain → plan. Progress is
// saved on the store (onboarding_step). Where they are can be read with
// the setup link or their login; the steps after the account need the
// logged-in owner, so they can leave and pick up where they left off.
router.get("/onboarding", resolveOnboardingStore, getOnboarding);
router.put("/subdomain", requireOnboardingOwner, updateSubdomain);
router.put("/plan", requireOnboardingOwner, selectPlan);

router.get("/", resolveStoreFromSubdomain, getStore);

router.get("/customers", authenticateAccount, resolveStoreFromAdminMembership, getCustomers);
router.delete("/customers/:id", authenticateAccount, resolveStoreFromAdminMembership, removeCustomer);

module.exports = router;