const { signEmailLoginToken } = require("./jwt.js");
const { storeBaseUrl } = require("./storeUrl.js");

// Turns a link to a page on the store's site into a sign-in link for one
// shopper (GET /api/auth/email-link), so tapping it in an alert email
// opens the page already logged in. One token per email covers all of
// its links. Links anywhere else are left as they are.
const signedLinker = (store, accountId) => {
  const base = storeBaseUrl(store);
  const token = signEmailLoginToken(accountId, store.id);
  return (url) => {
    if (typeof url !== "string" || !url.startsWith(base)) return url;
    const path = url.slice(base.length) || "/";
    return `${process.env.BACKEND_URL}/api/auth/email-link?t=${token}&to=${encodeURIComponent(path)}`;
  };
};

module.exports = { signedLinker };
