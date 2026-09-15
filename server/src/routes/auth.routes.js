const express = require("express");
const router = express.Router();
const  {authLimiter}  = require("../middleware/rateLimit.middleware.js")
const { resolveStoreFromSubdomain, resolveStoreForOnboarding } = require("../middleware/tenant.middleware.js");
const { authenticateAccount  } = require("../middleware/auth.middleware.js");
const { signup, login, logout, getMe, forgotPassword, resetPassword } = require("../controllers/auth.controller.js");

// resolveStoreFromSubdomain run first everywhere - established which store before anything checks who's logged in

router.post("/signup", authLimiter, resolveStoreForOnboarding, signup);
router.post("/login", authLimiter, resolveStoreForOnboarding, login);
router.post("/logout", logout);
router.get("/me", resolveStoreFromSubdomain, authenticateAccount, getMe);
router.post("/forgot-password", authLimiter, resolveStoreFromSubdomain, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

module.exports = router;
