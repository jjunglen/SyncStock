const express = require("express");
const router = express.Router();
const { resolveStoreFromSubdomain } = require("../middleware/tenant.middleware.js");
const { authenticateAccount  } = require("../middleware/auth.middleware.js");
const { signup, login, logout, getMe, forgotPassword, resetPassword } = require("../controllers/auth.controller.js");

// resolveStoreFromSubdomain run first everywhere - established which store before anything checks who's logged in

router.post("/signup", resolveStoreFromSubdomain, signup);
router.post("/login", resolveStoreFromSubdomain, login);
router.post("/logout", logout);
router.get("/me", resolveStoreFromSubdomain, authenticateAccount, getMe);
router.post("/forgot-password", resolveStoreFromSubdomain, forgotPassword );
router.post("/reset-password", resetPassword);

module.exports = router;
