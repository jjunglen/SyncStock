require("dotenv").config();
const twilio = require("twilio");

let client = null;

// Only initialize if credentials actually exist — same defensive
// pattern as passport.js, so a missing Twilio account can't crash
// the whole server on startup.
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
} else {
  console.warn("Twilio not configured — SMS sending will be disabled");
}

const sendVerificationCode = async (phoneNumber, code) => {
  if (!client) {
    console.warn("Skipped SMS — Twilio not configured");
    return;
  }
  await client.messages.create({
    to: phoneNumber,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: `Your Syncstock verification code is ${code}. It expires in 10 minutes.`,
  });
};

const sendDigestText = async ({ phoneNumber, store, items }) => {
  if (!client) {
    console.warn("Skipped SMS — Twilio not configured");
    return;
  }
  const names = items
    .slice(0, 2)
    .map((i) => i.shoe_name)
    .join(", ");
  const remaining = items.length > 2 ? ` +${items.length - 2} more` : "";

  await client.messages.create({
    to: phoneNumber,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: `${store.name}: ${names}${remaining} just went live. Check your email or visit ${store.subdomain}.syncstock.io — Reply STOP to unsubscribe.`,
  });
};

module.exports = { sendVerificationCode, sendDigestText };
