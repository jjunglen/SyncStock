// Sizes for the "other" category (snowboards, rings, jeans…). Each store
// keeps its own size chart in stores.size_settings.other (Size settings
// page):
//   label        — what the size is called ("Length (cm)", "Ring size")
//   sizes        — the sizes shoppers can pick, in the merchant's order
//   option_names — which Shopify options are sizes ("Length", "Size");
//                  anything else (Color, Material) is never read as a size
//
// Sizes match however they're written: "158", "158cm", "158 CM" and
// "Size 158" are the same size.

const MAX_SIZES = 100;
const MAX_SIZE_LENGTH = 20;
const MAX_LABEL_LENGTH = 30;

// "Size 158 cm" → "158"; "32 x 30" → "32x30"; blank → null
const sizeMatchKey = (size) => {
  const key = String(size ?? "")
    .toLowerCase()
    .replace(/size/g, "")
    .replace(/\s+/g, "")
    .replace(/cm$/, "");
  return key || null;
};

// The same rule in SQL, for filtering inventory by size key
const sizeKeySql = (column) =>
  `regexp_replace(regexp_replace(regexp_replace(lower(${column}), 'size', '', 'g'), '\\s', '', 'g'), 'cm$', '')`;

const sameSize = (a, b) => {
  const ka = sizeMatchKey(a);
  return ka !== null && ka === sizeMatchKey(b);
};

const otherSizeSettings = (store) => {
  const other = store?.size_settings?.other || {};
  return {
    label: String(other.label || "").trim() || null,
    sizes: Array.isArray(other.sizes) ? other.sizes.filter(Boolean) : [],
    option_names: Array.isArray(other.option_names) ? other.option_names.filter(Boolean) : [],
  };
};

// Cleans a size list from the merchant: trimmed, no blanks, no repeats
// (by size key), capped
const cleanSizeList = (list) => {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const size = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SIZE_LENGTH);
    const key = sizeMatchKey(size);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(size);
    if (out.length >= MAX_SIZES) break;
  }
  return out;
};

// --- Smart detection: which Shopify options are sizes ---------------
// Used until the merchant picks options themselves on Size settings.
// Read only: SyncStock never changes the merchant's products.

// Option names that are sizes, colors, or neither
const SIZE_NAMES = /\b(size|sizes|length|ring|waist|inseam|width|chest|neck|sleeve|shoe)\b/i;
const COLOR_NAMES = /colou?r|colorway|finish|metal|shade|pattern|print/i;
const OTHER_NAMES = /^title$|material|style|bundle|pack|flavou?r|scent|edition|model|type|quantity|amount|denomination/i;

// Values that look like sizes: 158, 158cm, 10.5, 7 1/2, 32x30, S/M/L,
// 10M, 5Y, 10M/11.5W, One size
const SIZE_VALUE = [
  /^\d+(\.\d+)?\s*(cm|mm|in|inch|inches|"|us|uk|eu)?$/i,
  /^\d+\s+\d\/\d$/,
  /^\d+(\.\d+)?\s*[x×]\s*\d+(\.\d+)?$/i,
  /^(xxs|xs|s|m|l|xl|xxl|xxxl|[2-6]xl|os|o\/s|one size|small|medium|large|x-?small|x-?large|xx-?large)$/i,
  /^\d+(\.\d+)?\s*[mwyck]$/i,
  /^\d+(\.\d+)?\s*m\s*\/\s*\d+(\.\d+)?\s*w$/i,
  /^(us|uk|eu)\s*\d+(\.\d+)?$/i,
];
const COLOR_WORDS =
  /\b(black|white|red|blue|navy|green|yellow|orange|purple|pink|brown|gr[ae]y|silver|gold|beige|tan|cream|ivory|olive|maroon|teal|turquoise|charcoal|khaki|burgundy|coral|mint|lavender|rose|bronze|copper|clear|natural|multi|camo|sand|stone|bone|cobalt|indigo|violet|magenta|lime|aqua|denim)\b|^#[0-9a-f]{3,6}$/i;

const isSizeValue = (v) => SIZE_VALUE.some((r) => r.test(String(v ?? "").trim()));
const isColorValue = (v) => COLOR_WORDS.test(String(v ?? "").trim());
const share = (values, test) => (values.length ? values.filter(test).length / values.length : 0);

// "size" | "color" | null — by the option's name, then by its values
const classifyOption = (name, values = []) => {
  const n = String(name || "").trim();
  if (!n || OTHER_NAMES.test(n)) return null;
  if (COLOR_NAMES.test(n)) return "color";
  if (SIZE_NAMES.test(n)) return "size";
  const vals = values.map((v) => String(v ?? "").trim()).filter(Boolean);
  if (share(vals, isSizeValue) >= 0.6 && share(vals, isColorValue) < 0.5) return "size";
  if (share(vals, isColorValue) >= 0.6) return "color";
  return null;
};

module.exports = {
  classifyOption,
  isSizeValue,
  sizeMatchKey,
  sizeKeySql,
  sameSize,
  otherSizeSettings,
  cleanSizeList,
  MAX_SIZES,
  MAX_SIZE_LENGTH,
  MAX_LABEL_LENGTH,
};
