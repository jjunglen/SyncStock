// SyncStock's own admin page (/platform): every store's numbers, for the
// people who run SyncStock — not store owners. Listed by email in
// PLATFORM_ADMIN_EMAILS (comma-separated). Requires authenticateAccount.
const platformAdminEmails = () =>
  (process.env.PLATFORM_ADMIN_EMAILS || "thelabdtx@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

// A verified email on the list, signed in with a password or Google
// (not a sign-in link from an alert email)
const isPlatformAdmin = (account, sessionVia) =>
  !!account &&
  account.email_verified === true &&
  sessionVia !== "email-link" &&
  platformAdminEmails().includes((account.email || "").toLowerCase());

// Anyone else gets a plain 404, so the page doesn't advertise itself
const requirePlatformAdmin = (req, res, next) => {
  if (!isPlatformAdmin(req.account, req.sessionVia)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  next();
};

module.exports = { isPlatformAdmin, requirePlatformAdmin };
