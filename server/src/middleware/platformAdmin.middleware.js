// SyncStock's own admin page (/platform): every store's numbers. Only
// this one login can open it — set here in code on purpose, so no
// setting or store account can grant it. Requires authenticateAccount.
const PLATFORM_ADMIN_EMAIL = "jpjunglen@syncstock.io";

// That verified email, signed in with a password or Google (not a
// sign-in link from an alert email)
const isPlatformAdmin = (account, sessionVia) =>
  !!account &&
  account.email_verified === true &&
  sessionVia !== "email-link" &&
  (account.email || "").toLowerCase() === PLATFORM_ADMIN_EMAIL;

// Anyone else gets a plain 404, so the page doesn't advertise itself
const requirePlatformAdmin = (req, res, next) => {
  if (!isPlatformAdmin(req.account, req.sessionVia)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  next();
};

module.exports = { PLATFORM_ADMIN_EMAIL, isPlatformAdmin, requirePlatformAdmin };
