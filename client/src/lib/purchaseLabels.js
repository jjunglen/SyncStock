// How each sale from alerts is labelled on the merchant dashboard and the
// Purchases page (server: attribution.service.js).

// How the sale was proven
const SOURCE_LABELS = {
  cart_tag: "Syncstock checkout",
  pixel: "Buy it now",
  utm: "Return visit",
};

// [{ label, tone }] — tone: "live" (good), "muted", "warn", "danger"
export const purchaseBadges = (p) => {
  const badges = [];
  const paid = parseFloat(p.price_paid) || 0;
  const refunded = parseFloat(p.refunded_amount) || 0;
  if (p.cancelled_at) badges.push({ label: "Cancelled", tone: "danger" });
  else if (refunded > 0 && refunded >= paid) badges.push({ label: "Refunded", tone: "danger" });
  else if (refunded > 0) badges.push({ label: "Partly refunded", tone: "warn" });
  // A different size or condition of the product they clicked — shown, but
  // not counted in revenue
  if (p.match_type === "product") badges.push({ label: "Assisted · other size", tone: "muted" });
  badges.push({ label: SOURCE_LABELS[p.attribution_source] || "Syncstock checkout", tone: "live" });
  return badges;
};

export const BADGE_CLASSES = {
  live: "bg-live/10 text-live",
  muted: "bg-text/5 text-text-muted",
  warn: "bg-warn/10 text-warn",
  danger: "bg-danger/10 text-danger",
};

// What the sale is worth now, after refunds
export const netAmount = (p) => Math.max((parseFloat(p.price_paid) || 0) - (parseFloat(p.refunded_amount) || 0), 0);
export const isRefunded = (p) => (parseFloat(p.refunded_amount) || 0) > 0;
