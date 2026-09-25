const { verifyToken } = require("./jwt.js");

const SESSION_COOKIE = "session_token";
const isProduction = process.env.NODE_ENV === "production";

// Shared across store subdomains in production (.syncstock.io)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  domain: isProduction ? ".syncstock.io" : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

// The account for the first session cookie that is valid AND whose
// account still exists. `reason` explains a miss for error messages.
const findSessionAccount = async (req, Account) => {
  const tokens = sessionTokens(req);
  if (tokens.length === 0) return { account: null, reason: "missing" };

  let reason = "invalid";
  for (const token of tokens) {
    const decoded = verifyToken(token);
    if (!decoded?.id) continue;
    const account = await Account.findByPk(decoded.id);
    if (account) return { account, reason: null };
    reason = "deleted";
  }
  return { account: null, reason };
};

const setSessionCookie = (res, token) => {
  if (COOKIE_OPTIONS.domain) res.clearCookie(SESSION_COOKIE, LEGACY_COOKIE_OPTIONS);
  res.cookie(SESSION_COOKIE, token, COOKIE_OPTIONS);
};

const clearSessionCookies = (res) => {
  res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
  if (COOKIE_OPTIONS.domain) res.clearCookie(SESSION_COOKIE, LEGACY_COOKIE_OPTIONS);
};

module.exports = {
  COOKIE_OPTIONS,
  findSessionAccount,
  setSessionCookie,
  clearSessionCookies,
};
