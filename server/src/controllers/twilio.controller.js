const crypto = require("crypto");
const { sendVerificationCode } = require("../services/sms.service.js");

// Twilio needs E.164 (+15551234567). Accepts "+1 (555) 123-4567",
// "555-123-4567" (assumed US), etc. Returns null if it can't be a number.
const toE164 = (input) => {
  const raw = String(input || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
};

const sendPhoneVerification = async (req, res) => {
  try {
    const phone_number = toE164(req.body.phone_number);
    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid phone number, like +1 555 123 4567",
      });
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
      .json({ success: true, message: "Verification code sent", phone_number });
  } catch (error) {
    console.error("Send phone verification error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send verification code" });
  }
};

const verifyPhone = async (req, res) => {
  try {
    const code = String(req.body.code || "").trim();

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
