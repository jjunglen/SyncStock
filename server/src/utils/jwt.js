require("dotenv").config();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// How long a login lasts. It renews as the shopper uses the site
// (renewSession in session.js), so regular visitors stay logged in.
const SESSION_DAYS = 60;
// With "Remember me" unticked: the login also ends when the browser
// closes (session.js), and at most this long after the last visit
const SHORT_SESSION_HOURS = 12;

// The session token, set as a cookie after login. `via: "email-link"`
// marks a login from a link in an alert email — those can browse and set
// alerts, but changing the email, phone or deleting the account needs a
// normal login (requireFullLogin). `remember: false` marks a login with
// "Remember me" unticked.
const signToken = (account, { via, remember = true } = {}) =>
  jwt.sign(
    { id: account.id, email: account.email, ...(via && { via }), ...(!remember && { remember: false }) },
    process.env.JWT_SECRET,
    { expiresIn: remember ? `${SESSION_DAYS}d` : `${SHORT_SESSION_HOURS}h` },
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

// Phone app: opening a store swaps the app's login for the store site's
// normal login cookie through this link (routes/app.routes.js). Single
// use (`jti`) and short-lived — the app opens it right away.
const signAppHandoffToken = (accountId, storeId) =>
  jwt.sign(
    { id: accountId, store_id: storeId, purpose: "app-handoff", jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: "2m" },
  );

const verifyAppHandoffToken = (token) => {
  try {
    const decoded = jwt.verify(String(token || ""), process.env.JWT_SECRET);
    return decoded.purpose === "app-handoff" ? decoded : null;
  } catch {
    return null;
  }
};

// Link in the daily Instagram stories email (routes/stories.routes.js):
// one store's new arrivals first seen between `from` and `to`. Anyone
// with the link sees those stories — they're made for posting publicly.
const signStoriesToken = (storeId, from, to) =>
  jwt.sign(
    { store_id: storeId, from: new Date(from).toISOString(), to: new Date(to).toISOString(), purpose: "stories" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

const verifyStoriesToken = (token) => {
  try {
    const decoded = jwt.verify(String(token || ""), process.env.JWT_SECRET);
    return decoded.purpose === "stories" ? decoded : null;
  } catch {
    return null;
  }
};

module.exports = {
  SESSION_DAYS,
  signStoriesToken,
  verifyStoriesToken,
  signAppHandoffToken,
  verifyAppHandoffToken,
  signEmailLoginToken,
  verifyEmailLoginToken,
  signToken,
  verifyToken,
  signOnboardingToken,
  verifyOnboardingToken,
  signEmailVerifyToken,
  verifyEmailVerifyToken,
};
