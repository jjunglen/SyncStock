const { parseVariantTitle } = require("./parseVariantTitle.js");
const { normalizeSize } = require("./categorize.js");

// Size, condition and box status for one Shopify variant — however the
// merchant set the product up. Copyt names variants
// "11M/12.5W - Brand New / Store"; a product made by hand in Shopify has a
// "Shoe size" option of "10" and the condition in its description. Both
// must end up as the same "10M/11.5W" shoppers save, or alerts never match.
//
// product: REST/webhook shape (title, handle, tags, body_html, options)
// variant: REST/webhook shape (title, option1..3), or with option_values
//          [{ name, value }] from the GraphQL catalog sync

// Men's sizes SyncStock lists (utils/validate.js); women's is men's + 1.5
const MEN = [
  3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 16, 17, 18,
];
const fmt = (n) => String(Number(n.toFixed(1))).replace(/\.0$/, "");
const canonical = (men) => (MEN.includes(men) ? `${fmt(men)}M/${fmt(men + 1.5)}W` : null);

// Grade-school sizes become the adult size shoppers save (as before)
const YOUTH = { 3.5: 3.5, 4: 4, 4.5: 4.5, 5: 5, 5.5: 5.5, 6: 6, 6.5: 6.5, 7: 7 };

const NUM = "(\\d{1,2}(?:\\.5)?)";
const WOMENS_PRODUCT = /\bwmns\b|\bwomen'?s\b|\bwomens\b|\(w\)/i;
// Kids' products, from the usual title labels: a plain "10" on a "(TD)"
// boot is toddler 10C, not men's 10
const TODDLER_PRODUCT = /\((?:td|toddler|infant|crib)\)|\btoddler\b/i;
const GRADE_SCHOOL_PRODUCT = /\((?:gs|grade school|youth)\)|\bgrade school\b/i;
const PRESCHOOL_PRODUCT = /\((?:ps|preschool|pre-school|little kids?)\)|\bpreschool\b/i;

// The age group a plain number belongs to, from the product's title/tags
const ageGroup = (text) => {
  if (TODDLER_PRODUCT.test(text)) return "toddler";
  if (PRESCHOOL_PRODUCT.test(text)) return "preschool";
  if (GRADE_SCHOOL_PRODUCT.test(text)) return "grade_school";
  if (WOMENS_PRODUCT.test(text)) return "womens";
  return "adult";
};

// "10", "US 10", "Men's 10", "10M", "W 11.5", "Women's 11.5", "11.5W",
// "10M/11.5W", "7Y", "GS 7", "10C" → SyncStock's size, or null. A plain
// number is read for the product's age group (adult, women's, kids').
const sneakerSize = (raw, group = "adult") => {
  let s = String(raw || "").trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^(us|size|sz)\s*/, "").replace(/\s*(us)$/, "").trim();

  let m = s.match(new RegExp(`^${NUM}\\s*m\\s*\\/\\s*${NUM}\\s*w$`));
  if (m) return canonical(Number(m[1]));

  m = s.match(new RegExp(`^${NUM}\\s*(?:y|gs|youth)$`)) || s.match(new RegExp(`^(?:y|gs|youth)\\s*${NUM}$`));
  if (m) {
    const youth = Number(m[1]);
    return YOUTH[youth] ? canonical(YOUTH[youth]) : `${fmt(youth)}Y`;
  }

  m = s.match(/^(\d{1,2})\s*(?:c|td|toddler)$/) || s.match(/^(?:c|td|toddler)\s*(\d{1,2})$/);
  if (m) return `${m[1]}C`;

  m = s.match(new RegExp(`^(?:w|wmns|women'?s|womens)\\s*${NUM}$`)) || s.match(new RegExp(`^${NUM}\\s*(?:w|wmns|women'?s|womens)$`));
  if (m) return canonical(Number(m[1]) - 1.5);

  m = s.match(new RegExp(`^(?:m|men'?s|mens)\\s*${NUM}$`)) || s.match(new RegExp(`^${NUM}\\s*(?:m|men'?s|mens)$`));
  if (m) return canonical(Number(m[1]));

  m = s.match(new RegExp(`^${NUM}$`));
  if (m) {
    const n = Number(m[1]);
    if (group === "toddler") return `${fmt(n)}C`;
    // Preschool runs 10.5C–13.5C, then 1Y–3Y
    if (group === "preschool") return n >= 10 ? `${fmt(n)}C` : `${fmt(n)}Y`;
    if (group === "grade_school") return YOUTH[n] ? canonical(YOUTH[n]) : `${fmt(n)}Y`;
    return canonical(group === "womens" ? n - 1.5 : n);
  }

  return null;
};

// The many ways resellers say each condition. "Unworn"/"never worn" are
// checked before "worn" so they count as new.
const NEVER_WORN = /\b(un-?worn|never\s+worn|not\s+worn)\b/;
const PRE_OWNED =
  /\b(pre[\s-]?owned|pre[\s-]?loved|used|worn|lightly\s+worn|gently\s+used|worn\s+(once|twice)|second[\s-]?hand|thrifted|vnds|very\s+near\s+deadstock|nds|near\s+deadstock|like\s+new|b[\s-]?grade|refurbished)\b|\b\d(\.\d)?\s*\/\s*10\b/;
const BRAND_NEW_PHRASES =
  /\b(brand[\s-]?new|deadstock|dead\s+stock|bnib|bnwt|bnwob|new\s+in\s+box|new\s+with(out)?\s+(box|tags?)|nib|nwt|nwb|nwob|factory\s+sealed|sealed|never\s+worn)\b|condition\s*[-:–]\s*new\b/;

// An option value or tag on its own, e.g. "New", "DS", "Used - 9/10".
// Standalone "New"/"DS" only count here — in titles and descriptions they
// would catch "New Balance" or "New Era".
const conditionFromValue = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return null;
  if (NEVER_WORN.test(v)) return "brand_new";
  if (PRE_OWNED.test(v)) return "pre_owned";
  if (/^(new|ds)$/.test(v) || BRAND_NEW_PHRASES.test(v)) return "brand_new";
  return null;
};

// Free text: the title or description
const conditionFromText = (text) => {
  const t = String(text || "").replace(/<[^>]+>/g, " ").toLowerCase();
  if (NEVER_WORN.test(t)) return "brand_new";
  if (PRE_OWNED.test(t)) return "pre_owned";
  if (BRAND_NEW_PHRASES.test(t)) return "brand_new";
  return null;
};

// The variant's options as [{ name, value }]
const optionValues = (product, variant) => {
  if (Array.isArray(variant.option_values)) return variant.option_values;
  const names = (product.options || [])
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((o) => o.name);
  return [variant.option1, variant.option2, variant.option3]
    .map((value, i) => ({ name: names[i] || "", value }))
    .filter((o) => o.value != null && o.value !== "");
};

const readVariant = (product, variant, category) => {
  const title = variant.title || "";
  const options = optionValues(product, variant);

  // Copyt's format first, read exactly as before — so existing stores'
  // sizes, conditions and box statuses don't change
  const copyt = parseVariantTitle(title, product.handle || "");
  let condition = copyt.condition;

  // Size: an option named "Size"/"Shoe size", else the start of the title
  // (Shopify joins a variant's options with " / ")
  // Copyt also puts its whole "S - Brand New" text in a Size option, so
  // only the part before " - " is the size
  const sizeOption = options.find((o) => /size/i.test(o.name));
  const rawSize = String(sizeOption ? sizeOption.value : copyt.size).split(" - ")[0].split(" / ")[0].trim();
  let size;
  if (category === "sneakers") {
    const tags = Array.isArray(product.tags) ? product.tags.join(" ") : product.tags || "";
    const group = ageGroup(`${product.title || ""} ${tags}`);
    size = sneakerSize(rawSize, group) || normalizeSize(rawSize, category);
  } else {
    size = normalizeSize(rawSize, category);
  }

  // Condition: Copyt title/handle, then a "Condition" option, any option
  // value, tags, the title, then the description
  if (condition === "either") {
    const conditionOption = options.find((o) => /condition/i.test(o.name));
    condition =
      (conditionOption && (conditionFromValue(conditionOption.value) || conditionFromText(conditionOption.value))) ||
      options.map((o) => conditionFromValue(o.value)).find(Boolean) ||
      (Array.isArray(product.tags) ? product.tags : String(product.tags || "").split(","))
        .map(conditionFromValue)
        .find(Boolean) ||
      conditionFromText(product.title) ||
      conditionFromText(product.body_html) ||
      "either";
  }

  return { size, condition, boxCondition: copyt.boxCondition };
};

module.exports = { readVariant, sneakerSize };
