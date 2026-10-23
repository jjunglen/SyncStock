// What goes on a new-arrival Instagram story, worked out from the
// product's in-stock variants and the store's settings. Kept apart from
// the drawing (services/storyImage.service.js), which needs the image
// packages, so the rest of the server never loads those at startup.

// "10.5M/12W" → "10.5" (resale lists the men's size); "5Y", "L" as-is
const shortSize = (size) => {
  const match = /^(\d+(?:\.\d+)?)M\/\d+(?:\.\d+)?W$/i.exec(String(size || "").trim());
  return match ? match[1] : String(size || "").trim();
};

const CONDITION_LABELS = { brand_new: "Brand New", pre_owned: "Pre-Owned" };
const conditionLabel = (condition) => {
  if (!condition || condition === "either") return null;
  return (
    CONDITION_LABELS[condition] ||
    String(condition).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
};

const sizeOrder = (a, b) => {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
};

// "Size 10 - Brand New", "Sizes 9, 10, 10.5 - Pre-Owned", "Size L", or
// null for a product without sizes
const sizeLine = (variants) => {
  const sizes = [...new Set(variants.map((v) => shortSize(v.size)).filter(Boolean))].sort(sizeOrder);
  const conditions = [...new Set(variants.map((v) => conditionLabel(v.condition)).filter(Boolean))];
  const condition = conditions.join(" / ");
  if (sizes.length === 0) return condition || null;
  // "OS" is one size fits all
  const label =
    sizes.length === 1 && /^(os|one size)$/i.test(sizes[0])
      ? "One Size"
      : `${sizes.length === 1 ? "Size" : "Sizes"} ${sizes.join(", ")}`;
  return condition ? `${label} - ${condition}` : label;
};

const money = (n) => {
  const value = Number(n);
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
};

// "$165", or "$90 - $110" when sizes are priced differently
const priceLine = (variants) => {
  const prices = variants.map((v) => Number(v.price)).filter((p) => p > 0);
  if (prices.length === 0) return null;
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high ? money(low) : `${money(low)} - ${money(high)}`;
};

// The store's story colors (Store settings), with the classic look —
// white background, black boxes, white text — as the default
const DEFAULT_STYLE = { background: "#ffffff", box: "#0b0b0b", text: "#ffffff" };
const HEX = /^#[0-9a-f]{6}$/i;
const storyStyle = (store) => ({
  background: HEX.test(store?.story_background) ? store.story_background : DEFAULT_STYLE.background,
  box: HEX.test(store?.story_box_color) ? store.story_box_color : DEFAULT_STYLE.box,
  text: HEX.test(store?.story_text_color) ? store.story_text_color : DEFAULT_STYLE.text,
});

module.exports = { shortSize, sizeLine, priceLine, storyStyle, DEFAULT_STYLE };
