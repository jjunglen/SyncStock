// Decides which dashboard category a Shopify product belongs to.
// Fields are checked most-reliable first — product type, then tags, then
// title — and the first keyword hit wins. Sneakers is the default, since
// that's the original product line.

const CATEGORIES = ["sneakers", "clothing", "trading_cards"];

const KEYWORDS = {
  trading_cards: [
    "trading card", "trading cards", "card", "cards", "tcg", "pokemon",
    "pokémon", "yu-gi-oh", "yugioh", "magic the gathering", "mtg", "psa",
    "bgs", "cgc", "sgc", "slab", "booster", "sports card",
  ],
  clothing: [
    "apparel", "clothing", "shirt", "t-shirt", "tee", "tees", "hoodie",
    "sweatshirt", "crewneck", "sweater", "jacket", "coat", "vest", "pants",
    "jeans", "shorts", "joggers", "sweatpants", "hat", "cap", "beanie",
    "socks", "jersey", "polo", "outerwear", "headwear", "cardigan",
    "fleece", "tank", "windbreaker", "accessories",
    "accessory",
  ],
  sneakers: ["sneaker", "sneakers", "shoe", "shoes", "footwear", "trainer", "slide", "boot"],
};

// Letter sizes, plus the long forms Shopify stores often use
const CLOTHING_SIZE_ALIASES = {
  xxs: "XXS", xs: "XS", s: "S", m: "M", l: "L", xl: "XL", xxl: "XXL", xxxl: "XXXL",
  "x-small": "XS", small: "S", medium: "M", large: "L", "x-large": "XL",
  "xx-large": "XXL", "xxx-large": "XXXL", "2xl": "XXL", "3xl": "XXXL",
  "one size": "OS", os: "OS",
};

const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matchers = Object.fromEntries(
  Object.entries(KEYWORDS).map(([category, words]) => [
    category,
    new RegExp(`\\b(${words.map(escape).join("|")})\\b`, "i"),
  ]),
);

const categoryFromText = (text) => {
  if (!text) return null;
  for (const category of ["trading_cards", "clothing", "sneakers"]) {
    if (matchers[category].test(text)) return category;
  }
  return null;
};

const GIFT_CARD = /\bgift ?cards?\b/i;

// product: a Shopify product (REST/webhook shape). Returns null for
// products that shouldn't be listed at all (gift cards).
const categorizeProduct = (product) => {
  if (product.gift_card || GIFT_CARD.test(product.product_type || "") || GIFT_CARD.test(product.title || "")) {
    return null;
  }

  const tags = Array.isArray(product.tags) ? product.tags.join(", ") : product.tags;
  const fromText =
    categoryFromText(product.product_type) ||
    categoryFromText(tags) ||
    categoryFromText(product.title);
  if (fromText) return fromText;

  // No keywords: variants titled S/M/L... are clothing
  const firstSize = (product.variants?.[0]?.title || "").split(" - ")[0].trim().toLowerCase();
  if (CLOTHING_SIZE_ALIASES[firstSize]) return "clothing";

  return "sneakers";
};

// Sizes are category-specific: clothing sizes are normalized to letters,
// and trading cards have no size (Shopify's lone variant is "Default Title")
const normalizeSize = (size, category) => {
  if (!size || size === "Default Title") return null;
  if (category === "trading_cards") return null;
  if (category === "clothing") {
    return CLOTHING_SIZE_ALIASES[size.trim().toLowerCase()] || size;
  }
  return size;
};

module.exports = { CATEGORIES, categorizeProduct, normalizeSize };
