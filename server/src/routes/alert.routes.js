const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { authLimiter } = require("../middleware/rateLimit.middleware.js");
const {
  signup,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller.js");

router.post("/signup", authLimiter, resolveStoreFromSubdomain, signup);
router.post("/login", authLimiter, resolveStoreFromSubdomain, login);
router.post("/logout", logout);
router.get("/me", resolveStoreFromSubdomain, authenticateAccount, getMe);
router.post(
  "/forgot-password",
  authLimiter,
  resolveStoreFromSubdomain,
  forgotPassword,
);
router.post("/reset-password", authLimiter, resetPassword);

module.exports = router;
