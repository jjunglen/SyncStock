const crypto = require("crypto");
const { sendVerificationCode } = require("../services/sms.service.js");

const sendPhoneVerification = async (req, res) => {
  try {
    const { phone_number } = req.body;
    if (!phone_number) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await req.account.update({
      phone_number,
      phone_verified: false,
      phone_verification_code: code,
      phone_verification_expires: expires,
    });

    await sendVerificationCode(phone_number, code).catch((err) =>
      console.error("Send verification SMS error:", err.message),
    );

    return res
      .status(200)
      .json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Send phone verification error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send verification code" });
  }
};

const verifyPhone = async (req, res) => {
  try {
    const { code } = req.body;

    if (
      !req.account.phone_verification_code ||
      req.account.phone_verification_code !== code ||
      req.account.phone_verification_expires < new Date()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired code" });
    }

    await req.account.update({
      phone_verified: true,
      phone_verification_code: null,
      phone_verification_expires: null,
    });

    return res
      .status(200)
      .json({ success: true, message: "Phone number verified" });
  } catch (error) {
    console.error("Verify phone error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Verification failed" });
  }
};

module.exports = { sendPhoneVerification, verifyPhone };
