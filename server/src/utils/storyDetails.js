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

// Label fonts a store can pick, named after the Instagram story style
// each one resembles (Instagram's own fonts can't be used outside the
// app; these are free lookalikes from @fontsource).
//   package/weight — the font file; widthEm — average letter width, used
//   to fit long lines; upper — all caps; letterSpacing (em); stroke —
//   outline in the text color, to thicken a thin font; scale — size
//   boost for a font whose letters sit small for their size
const STORY_FONTS = {
  strong: { label: "Strong", family: "Oswald", package: "oswald", weight: 500, widthEm: 0.45 },
  squeeze: { label: "Squeeze", family: "Bebas Neue", package: "bebas-neue", weight: 400, widthEm: 0.34, upper: true, letterSpacing: 0.02, scale: 1.25 },
  poster: { label: "Poster", family: "Anton", package: "anton", weight: 400, widthEm: 0.47, upper: true },
  bubble: { label: "Bubble", family: "Fredoka", package: "fredoka", weight: 600, widthEm: 0.55 },
  deco: { label: "Deco", family: "Poiret One", package: "poiret-one", weight: 400, widthEm: 0.55, upper: true, letterSpacing: 0.06, stroke: 2 },
  elegant: { label: "Elegant", family: "Playfair Display", package: "playfair-display", weight: 700, widthEm: 0.55 },
  typewriter: { label: "Typewriter", family: "Courier Prime", package: "courier-prime", weight: 700, widthEm: 0.6 },
  modern: { label: "Modern", family: "Montserrat", package: "montserrat", weight: 700, widthEm: 0.62, upper: true },
  classic: { label: "Classic", family: "Inter", package: "inter", weight: 700, widthEm: 0.57 },
};
const DEFAULT_FONT = "strong";

// The store's story look (Store settings), with the classic one — white
// background, black boxes, white text, Strong — as the default
const DEFAULT_STYLE = { background: "#ffffff", box: "#0b0b0b", text: "#ffffff", font: DEFAULT_FONT };
const HEX = /^#[0-9a-f]{6}$/i;
const storyStyle = (store) => ({
  background: HEX.test(store?.story_background) ? store.story_background : DEFAULT_STYLE.background,
  box: HEX.test(store?.story_box_color) ? store.story_box_color : DEFAULT_STYLE.box,
  text: HEX.test(store?.story_text_color) ? store.story_text_color : DEFAULT_STYLE.text,
  font: STORY_FONTS[store?.story_font] ? store.story_font : DEFAULT_FONT,
});

module.exports = { shortSize, sizeLine, priceLine, storyStyle, DEFAULT_STYLE, STORY_FONTS, DEFAULT_FONT };
