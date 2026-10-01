// Where a shopper came from when they joined a store — e.g. the
// "Restock alerts" section or floating button on the merchant's own
// Shopify site (GET /api/store/go sets the cookie). Saved on the
// membership so the dashboard can count signups from the website.
const REF_COOKIE = "ss_ref";
const SOURCES = ["shopify_banner", "shopify_floating"];
const REF_DAYS = 30;

const refCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  domain: process.env.NODE_ENV === "production" ? ".syncstock.io" : undefined,
  maxAge: REF_DAYS * 24 * 60 * 60 * 1000,
});

const signupSource = (req) => {
  const value = req.cookies?.[REF_COOKIE];
  return SOURCES.includes(value) ? value : null;
};

module.exports = { REF_COOKIE, SOURCES, refCookieOptions, signupSource };
