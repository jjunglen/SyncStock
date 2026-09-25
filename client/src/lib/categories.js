// Product categories a store can carry. The dashboard only shows the
// ones returned by GET /inventory/categories (see server utils/categorize.js).
export const CATEGORY_META = {
  // sizeName: shorter word for size sentences ("No clothing sizes saved")
  sneakers: { label: "Sneakers", sizeName: "sneaker", noun: "shoe" },
  clothing: { label: "Clothing & accessories", sizeName: "clothing", noun: "item" },
  trading_cards: { label: "Trading cards", sizeName: null, noun: "card" },
};

export const SNEAKER_SIZES = [
  "3.5M/5W", "4M/5.5W", "4.5M/6W", "5M/6.5W", "5.5M/7W", "6M/7.5W",
  "6.5M/8W", "7M/8.5W", "7.5M/9W", "8M/9.5W", "8.5M/10W", "9M/10.5W",
  "9.5M/11W", "10M/11.5W", "10.5M/12W", "11M/12.5W", "11.5M/13W",
  "12M/13.5W", "12.5M/14W", "13M/14.5W", "13.5M/15W", "14M/15.5W",
  "14.5M/16W", "15M", "16M", "17M",
];

export const CLOTHING_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "OS"];

// Size options per category — trading cards have none
export const SIZES_BY_CATEGORY = {
  sneakers: SNEAKER_SIZES,
  clothing: CLOTHING_SIZES,
  trading_cards: [],
};
