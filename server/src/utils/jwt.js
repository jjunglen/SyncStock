require("dotenv").config();
const jwt = require("jsonwebtoken");

// How long a login lasts. It renews as the shopper uses the site
// (renewSession in session.js), so regular visitors stay logged in.
const SESSION_DAYS = 60;

// The session token, set as a cookie after login. `via: "email-link"`
// marks a login from a link in an alert email — those can browse and set
// alerts, but changing the email, phone or deleting the account needs a
// normal login (requireFullLogin).
const signToken = (account, { via } = {}) =>
  jwt.sign(
    { id: account.id, email: account.email, ...(via && { via }) },
    process.env.JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` },
  );

// Sign-in link for one shopper at one store, used in alert emails: tapping
// a shoe logs them in even in an email app's own browser (which doesn't
// share the phone browser's login). Lasts 7 days from the email.
const signEmailLoginToken = (accountId, storeId) =>
  jwt.sign({ id: accountId, store_id: storeId, purpose: "email-login" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const verifyEmailLoginToken = (token) => {
  try {
    const decoded = jwt.verify(String(token || ""), process.env.JWT_SECRET);
    return decoded.purpose === "email-login" ? decoded : null;
  } catch {
    return null;
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const signOnboardingToken = (storeId) => {
  return jwt.sign({ store_id: storeId, purpose: "onboarding"}, process.env.JWT_SECRET, {
    expiresIn: "10m",

  })
}

const verifyOnboardingToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== "onboarding") return { valid: false, expired: false };
    
    return { valid: true, storeId: decoded.store_id };

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return { valid: false, expired: true };
    }
    return { valid: false, expired: false };
  }
};

// Email verification link (24h). Carries where to send the person after
// verifying: a merchant back to onboarding, or a shopper to their store.
const signEmailVerifyToken = (accountId, { storeId = null, merchant = false, redirect = null } = {}) =>
  jwt.sign(
    { id: accountId, purpose: "verify-email", store_id: storeId, merchant, redirect },
    process.env.JWT_SECRET,
    { expiresIn: "24h" },
  );

const verifyEmailVerifyToken = (token) => {
  try {
    const decoded = jwt.verify(String(token || ""), process.env.JWT_SECRET);
    return decoded.purpose === "verify-email" ? decoded : null;
  } catch {
    return null;
  }
};

module.exports = {
  SESSION_DAYS,
  signEmailLoginToken,
  verifyEmailLoginToken,
  signToken,
  verifyToken,
  signOnboardingToken,
  verifyOnboardingToken,
  signEmailVerifyToken,
  verifyEmailVerifyToken,
};
