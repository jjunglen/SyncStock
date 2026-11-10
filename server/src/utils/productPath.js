// A product's public page on the store's site: /p/<shopify product id>-<name>
// ("/p/8123456789-jordan-4-retro-white-oreo"). The number finds the
// product; the name is only for people and search engines. The client
// builds the same address (client/src/lib/productPath.js).
const slugify = (text) =>
  String(text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

const productPath = (productId, name) => {
  const slug = slugify(name);
  return `/p/${productId}${slug ? `-${slug}` : ""}`;
};

module.exports = { slugify, productPath };
