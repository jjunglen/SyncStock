const express = require("express");
const router = express.Router();
const { authLimiter } = require("../middleware/rateLimit.middleware.js");
const {
  resolveStoreFromSubdomain,
  resolveStoreForOnboarding,
  attachStoreIfPresent,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount, requireFullLogin } = require("../middleware/auth.middleware.js");
const {
  signup,
  login,
  merchantLogin,
  verifyEmail,
  resendVerification,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  emailLinkLogin,
  logoutEverywhere,
} = require("../controllers/auth.controller.js");

// resolveStoreFromSubdomain run first everywhere - established which store before anything checks who's logged in

router.post("/signup", authLimiter, resolveStoreForOnboarding, signup);
router.post("/login", authLimiter, attachStoreIfPresent, login);
router.post("/merchant/login", authLimiter, merchantLogin);
// Email verification: the link from the email, and "send it again"
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authLimiter, attachStoreIfPresent, resendVerification);
router.post("/logout", logout);
router.post("/logout-everywhere", authenticateAccount, requireFullLogin, logoutEverywhere);
// Sign-in links in alert emails (auth.controller.js emailLinkLogin)
router.get("/email-link", emailLinkLogin);
router.get("/me", attachStoreIfPresent, authenticateAccount, getMe);
// Works on syncstock.io (merchants) and on store sites (shoppers)
router.post("/forgot-password", authLimiter, attachStoreIfPresent, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

module.exports = router;