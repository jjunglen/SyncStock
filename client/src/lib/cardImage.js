// A smaller copy of a product photo for cards. Stores upload large photos
// (1000x1000 PNGs, ~4 MB each once a phone decodes them); a card shows
// them at most ~575px wide, and dozens of full-size photos on a scrolling
// list can run iPhone Safari out of memory ("A problem occurred").
// Shopify's image CDN resizes with ?width=; other hosts are left as is.
export const cardImage = (url, width = 600) => {
  if (!url || !/^https:\/\/cdn\.shopify\.com\//.test(url)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("width", String(width));
    return u.toString();
  } catch {
    return url;
  }
};
