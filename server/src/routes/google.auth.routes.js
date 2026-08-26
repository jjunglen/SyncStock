const express = require("express");
const router = express.Router();
const passport = require("../config/passport.js");
const {
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const { googleCallback } = require("../controllers/google.auth.controller.js");

// GET /api/auth/google — redirect to Google login.
// resolveStoreFromSubdomain runs FIRST so req.store exists, letting
// us encode which store this login started from into the state
// param — Google echoes it back untouched on the callback below.
router.get("/google", resolveStoreFromSubdomain, (req, res, next) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: JSON.stringify({ store_id: req.store.id }),
  })(req, res, next);
});

// GET /api/auth/google/callback — Google redirects here.
// No tenant middleware needed on this route: the callback itself
// reads store_id back out of req.query.state, not off the subdomain
// (Google's callback URL is one fixed address, not store-specific).
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth?error=google_failed`,
  }),
  googleCallback,
);

module.exports = router;
