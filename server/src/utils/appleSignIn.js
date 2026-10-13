const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Sign in with Apple (phone app). The app gets an identity token from
// Apple and sends it here; it's a JWT signed with one of Apple's public
// keys, which are published at APPLE_KEYS_URL and rotate occasionally.
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
const KEYS_TTL_MS = 6 * 60 * 60 * 1000;

let cachedKeys = null;
let cachedAt = 0;

const appleKeys = async ({ refresh = false } = {}) => {
  if (!refresh && cachedKeys && Date.now() - cachedAt < KEYS_TTL_MS) return cachedKeys;
  const resp = await fetch(APPLE_KEYS_URL);
  if (!resp.ok) throw new Error(`Apple keys request failed (${resp.status})`);
  const { keys } = await resp.json();
  cachedKeys = keys || [];
  cachedAt = Date.now();
  return cachedKeys;
};

// The app's bundle id (APPLE_BUNDLE_ID, e.g. io.syncstock.app) — Apple
// puts it in the token's audience. Comma-separate to allow more than one.
const allowedAudiences = () =>
  (process.env.APPLE_BUNDLE_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

// The verified claims ({ sub, email, email_verified, ... }) or null.
// `sub` is Apple's stable id for the person — the email can be a private
// relay address, and Apple only sends it reliably on the first sign-in.
const verifyAppleIdentityToken = async (token) => {
  const audience = allowedAudiences();
  if (!token || typeof token !== "string" || audience.length === 0) return null;

  const header = jwt.decode(token, { complete: true })?.header;
  if (!header?.kid) return null;

  // A key we haven't seen means Apple rotated — fetch the list once more
  let jwk = (await appleKeys()).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await appleKeys({ refresh: true })).find((k) => k.kid === header.kid);
  if (!jwk) return null;

  try {
    const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
    const claims = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
      issuer: APPLE_ISSUER,
      audience,
    });
    return claims?.sub ? claims : null;
  } catch {
    return null;
  }
};

module.exports = { verifyAppleIdentityToken };
