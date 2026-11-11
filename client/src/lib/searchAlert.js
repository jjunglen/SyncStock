// "Alert me when it's in": a search that found nothing in stock (or only
// close matches) turns into an alert. Track an item opens with the
// search already running (?q=), over the store's own products, sold-out
// ones included, and StockX. Signed-out shoppers sign up first and land
// there.

// Track handles sneakers and clothing sizes; anything else opens in
// sneakers mode, which still finds the store's own products
const TRACK_CATEGORIES = ["sneakers", "clothing"];

export const searchAlertPath = (q, category, signedIn) => {
  const params = new URLSearchParams({ q: String(q || "").trim().slice(0, 80) });
  if (TRACK_CATEGORIES.includes(category)) params.set("category", category);
  const track = `/store/track?${params.toString()}`;
  return signedIn ? track : `/store/signup?redirect=${encodeURIComponent(track)}`;
};

// Trading cards have no Track page (no sizes or StockX search for them)
export const canAlertSearch = (q, category) => !!String(q || "").trim() && category !== "trading_cards";
