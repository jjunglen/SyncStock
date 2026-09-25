const express = require("express");
const router = express.Router();
const passport = require("../config/passport.js");
const {
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const {
  googleCallback,
  redirectToLogin,
} = require("../controllers/google.auth.controller.js");
const { safeRedirectPath } = require("../utils/storeUrl.js");

// GET /api/auth/google — redirect to Google login.
// resolveStoreFromSubdomain runs FIRST so req.store exists, letting
// us encode which store this login started from into the state
// param — Google echoes it back untouched on the callback below.
// This is a full-page browser redirect, so the client can't send the
// X-Store-Subdomain header it uses for API calls — it passes ?store=
// instead. ?redirect= is the page to return to after login.
const storeFromQuery = (req, res, next) => {
  if (req.query.store) req.headers["x-store-subdomain"] = String(req.query.store);
  next();
};

router.get("/google", storeFromQuery, resolveStoreFromSubdomain, (req, res, next) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: JSON.stringify({
      store_id: req.store.id,
      redirect: safeRedirectPath(req.query.redirect),
    }),
  })(req, res, next);
});

// GET /api/auth/google/callback — Google redirects here.
// No tenant middleware needed on this route: the callback itself
// reads store_id back out of req.query.state, not off the subdomain
// (Google's callback URL is one fixed address, not store-specific).
// Custom callback instead of failureRedirect so a failed or cancelled
// login can go back to the right store's login page (read from state)
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      const error = req.query.error === "access_denied" ? "google_cancelled" : "google_failed";
      return redirectToLogin(req, res, error);
    }
    req.user = user;
    return googleCallback(req, res);
  })(req, res, next);
});

module.exports = router;
