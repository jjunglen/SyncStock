// The price-range slider's scale (components/ui/PriceRangeSlider.jsx)
// and converting between it and an alert's min_price / max_price.
// The top of the scale means "no maximum", the bottom "no minimum".
export const PRICE_MIN = 0;
export const PRICE_MAX = 1000;
// Typed prices are kept exact ($245 stays $245); only the scale's ends clamp
const clampToScale = (v) => Math.max(PRICE_MIN, Math.min(PRICE_MAX, Math.round(v)));

export const rangeFromPrices = (min, max) => [
  min ? clampToScale(Number(min)) : PRICE_MIN,
  max && Number(max) < PRICE_MAX ? clampToScale(Number(max)) : PRICE_MAX,
];

export const pricesFromRange = ([low, high]) => ({
  min_price: low > PRICE_MIN ? low : null,
  max_price: high < PRICE_MAX ? high : null,
});

// "$100 – $300", "Up to $300", "$200+", or null for any price
export const priceRangeLabel = (min, max) => {
  const lo = min ? `$${parseFloat(min).toFixed(0)}` : null;
  const hi = max ? `$${parseFloat(max).toFixed(0)}` : null;
  if (lo && hi) return `${lo} – ${hi}`;
  if (hi) return `Up to ${hi}`;
  if (lo) return `${lo}+`;
  return null;
};
