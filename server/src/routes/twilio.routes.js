const express = require("express");
const router = express.Router();
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { authLimiter } = require("../middleware/rateLimit.middleware.js");
const { sendPhoneVerification, verifyPhone } = require("../controllers/twilio.controller.js");

router.use(authenticateAccount);

// Rate-limited: each send-code is a paid text (and a target for SMS
// pumping fraud), and verify guards a 6-digit code against guessing
router.post("/send-code", authLimiter, sendPhoneVerification);
router.post("/verify", authLimiter, verifyPhone);

module.exports = router;