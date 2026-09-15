const express = require("express");
const router = express.Router();
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const {
  resolveStoreFromSubdomain,
  resolveStoreForOnboarding,
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

// Subdomain and plan now happen BEFORE login — resolved via the
// onboarding token, since no account exists yet at this point.
router.put("/subdomain", resolveStoreForOnboarding, updateSubdomain);
router.put("/plan", resolveStoreForOnboarding, selectPlan);

router.get("/", resolveStoreFromSubdomain, getStore);

router.get("/customers", authenticateAccount, resolveStoreFromAdminMembership, getCustomers);
router.delete("/customers/:id", authenticateAccount, resolveStoreFromAdminMembership, removeCustomer);

module.exports = router;