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

module.exports = {
  sizeMatchKey,
  sizeKeySql,
  sameSize,
  otherSizeSettings,
  cleanSizeList,
  MAX_SIZES,
  MAX_SIZE_LENGTH,
  MAX_LABEL_LENGTH,
};
