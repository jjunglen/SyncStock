const express = require("express");
const router = express.Router();
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { sendPhoneVerification, verifyPhone } = require("../controllers/twilio.controller.js");

router.use(authenticateAccount);

router.post("/send-code", sendPhoneVerification);
router.post("/verify", verifyPhone);

module.exports = router;