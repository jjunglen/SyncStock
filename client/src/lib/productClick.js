import api from "./api.js";

// A shopper opened a product, for the platform admin's "Most clicked"
// (Shopper activity). source: "page" (its /p/ page), "popup" (the
// dashboard pop-out) or "coming_soon" (a Coming soon item's details).
// Counted once per person per product per day on the server; a failure
// never shows.
export const countProductClick = (productId, source) => {
  if (!productId) return;
  api.post("/inventory/clicks", { product_id: String(productId), source }).catch(() => {});
};
