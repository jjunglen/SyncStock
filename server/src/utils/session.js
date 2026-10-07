const { verifyToken, signToken, SESSION_DAYS } = require("./jwt.js");

const SESSION_COOKIE = "session_token";
const isProduction = process.env.NODE_ENV === "production";

// Shared across store subdomains in production (.syncstock.io)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  domain: isProduction ? ".syncstock.io" : undefined,
  maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
};

// Before NODE_ENV=production was set, the cookie belonged to the API host
// only (no Domain). Browsers that still hold one send it FIRST, ahead of
// the current .syncstock.io cookie — so it's cleared on login and logout.
const LEGACY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

// Every session cookie the browser sent (normally one; two while a
// legacy cookie is still around). cookie-parser only keeps the first.
const sessionTokens = (req) =>
  (req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${SESSION_COOKIE}=`))
    .map((part) => {
      try {
        return decodeURIComponent(part.slice(SESSION_COOKIE.length + 1));
      } catch {
        return "";
      }
    })
    .filter(Boolean);

// A token from before the account's "log out everywhere" moment (password
// reset or the profile button) no longer counts. Compared in whole
// seconds, the precision tokens carry.
const issuedBeforeCutoff = (decoded, account) =>
  !!account.sessions_valid_after &&
  decoded.iat < Math.floor(new Date(account.sessions_valid_after).getTime() / 1000);

// The account for the first session cookie that is valid AND whose
// account still exists. `reason` explains a miss for error messages.
// Only session tokens count — not other signed links (email
// verification, email sign-in), which carry a `purpose`.
const findSessionAccount = async (req, Account) => {
  const tokens = sessionTokens(req);
  if (tokens.length === 0) return { account: null, reason: "missing" };

  let reason = "invalid";
  for (const token of tokens) {
    const decoded = verifyToken(token);
    if (!decoded?.id || decoded.purpose) continue;
    const account = await Account.findByPk(decoded.id);
    if (!account) {
      reason = "deleted";
      continue;
    }
    if (issuedBeforeCutoff(decoded, account)) continue; // logged out everywhere
    return { account, session: decoded, reason: null };
  }
  return { account: null, reason };
};

// Keeps regular shoppers logged in: once a day of use, the 60-day clock
// restarts. Keeps how the session started (normal or email link).
const RENEW_AFTER_SECONDS = 24 * 60 * 60;
const renewSession = (res, account, session) => {
  if (!session?.iat || Date.now() / 1000 - session.iat < RENEW_AFTER_SECONDS) return;
  setSessionCookie(res, signToken(account, { via: session.via }));
};

const setSessionCookie = (res, token) => {
  if (COOKIE_OPTIONS.domain) res.clearCookie(SESSION_COOKIE, LEGACY_COOKIE_OPTIONS);
  res.cookie(SESSION_COOKIE, token, COOKIE_OPTIONS);
};

// Clearing needs the cookie's identity (domain, path, flags) but not its
// lifetime — Express deprecates passing maxAge to clearCookie
const { maxAge: _maxAge, ...CLEAR_COOKIE_OPTIONS } = COOKIE_OPTIONS;

const clearSessionCookies = (res) => {
  res.clearCookie(SESSION_COOKIE, CLEAR_COOKIE_OPTIONS);
  if (COOKIE_OPTIONS.domain) res.clearCookie(SESSION_COOKIE, LEGACY_COOKIE_OPTIONS);
};

module.exports = {
  issuedBeforeCutoff,
  renewSession,
  COOKIE_OPTIONS,
  findSessionAccount,
  setSessionCookie,
  clearSessionCookies,
};
