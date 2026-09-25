const express = require("express");
const router = express.Router();
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const {
  resolveStoreFromSubdomain,
  requireOnboardingToken,
  resolveStoreFromAdminMembership,
} = require("../middleware/tenant.middleware.js");
const {
  initiateShopifyConnect,
  handleShopifyCallback,
  checkDomain,
  updateSubdomain,
  selectPlan,
  getStore,
  getCustomers,
  removeCustomer,
} = require("../controllers/store.controller.js");

// No store resolution on these — nothing exists yet to resolve.
router.post("/check-domain", checkDomain);
router.get("/shopify/connect", initiateShopifyConnect);
router.get("/shopify/callback", handleShopifyCallback);

// Subdomain and plan happen BEFORE login — no account exists yet, so
// the onboarding token (from the Shopify connect callback) is the only
// proof this request comes from the store's owner.
router.put("/subdomain", requireOnboardingToken, updateSubdomain);
router.put("/plan", requireOnboardingToken, selectPlan);

router.get("/", resolveStoreFromSubdomain, getStore);

router.get("/customers", authenticateAccount, resolveStoreFromAdminMembership, getCustomers);
router.delete("/customers/:id", authenticateAccount, resolveStoreFromAdminMembership, removeCustomer);

module.exports = router;