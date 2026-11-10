// A product's public page on the store's site: /p/<shopify product id>-<name>
// ("/p/8123456789-jordan-4-retro-white-oreo"). The number finds the
// product; the name is for people and search engines. The server's
// sitemap builds the same address (server/src/utils/productPath.js).
export const slugify = (text) =>
  String(text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

export const productPath = (item) => {
  const id = item.shopify_product_id;
  const slug = slugify(item.product_name);
  return `/p/${id}${slug ? `-${slug}` : ""}`;
};

// The product id at the start of a /p/ address, or null
export const productIdFromParam = (param) => String(param || "").match(/^(\d{1,20})(?:-|$)/)?.[1] || null;

export const formatPrice = (price) => (price ? `$${parseFloat(price).toFixed(0)}` : "");
