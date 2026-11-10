// Words for "Sell your items" that depend on what's being sold: shoes
// come in a box, clothing in packaging, and each needs different photos.

const isShoe = (category) => !category || category === "sneakers";

// "box" or "packaging"
export const packagingWord = (category) => (isShoe(category) ? "box" : "packaging");

// The box choices (SellItem.box), worded for the item
export const boxOptions = (category) => {
  const word = packagingWord(category);
  return [
    { key: "original", label: `Original ${word}` },
    { key: "damaged", label: `Damaged ${word}` },
    { key: "none", label: `No ${word}` },
  ];
};

// One item's box as text: "Original box", "No packaging"
export const boxLabel = (box, category) => boxOptions(category).find((o) => o.key === box)?.label || null;

// The photos to take, in order, by condition
const SHOTS = {
  shoe: {
    new: ["Pair, side view", "Box label"],
    used: ["Left side", "Right side", "Soles", "Insole or tag", "Box label", "Extra"],
  },
  other: {
    new: ["Front", "Tag"],
    used: ["Front", "Back", "Tag", "Close-up of any wear", "Packaging", "Extra"],
  },
};
export const photoShots = (condition, category) => SHOTS[isShoe(category) ? "shoe" : "other"][condition] || [];

// Trading cards: front and back of the card (or slab, or sealed box)
const CARD_SHOTS = {
  raw: ["Front", "Back", "Close-up", "Extra"],
  graded: ["Front of slab", "Back of slab", "Close-up", "Extra"],
  sealed: ["Front", "Back", "Close-up of wrap", "Extra"],
};
export const sellPhotoShots = (item) =>
  item.category === "trading_cards" ? CARD_SHOTS[item.condition] || CARD_SHOTS.raw : photoShots(item.condition, item.category);

const RAW = { NM: "Near Mint", LP: "Lightly Played", MP: "Moderately Played" };
const COMPANY = { PSA: "PSA", CGC: "CGC", BGS: "Beckett", OTHER: "Graded" };
const CONDITION = { new: "Brand new", used: "Pre-owned" };

// An item's details for lists: ["Size 10M/11.5W", "Pre-owned", "Original box"],
// or for cards ["Beckett Black Label", "Cert 0012345678"], ["Raw", "Near Mint"],
// ["Factory Sealed"]
export const sellItemDetails = (item) => {
  if (item.category === "trading_cards") {
    const card = item.card || {};
    if (item.condition === "graded") {
      const grade = card.grade === "BL" ? "Black Label" : card.grade;
      return [`${COMPANY[card.grading_company] || "Graded"} ${grade || ""}`.trim(), card.cert_number ? `Cert ${card.cert_number}` : null].filter(Boolean);
    }
    if (item.condition === "sealed") return [item.box === "damaged" ? "Sealed · Damaged" : "Factory Sealed"];
    return ["Raw", RAW[card.raw_condition || item.size] || item.size];
  }
  return [`Size ${item.size}`, CONDITION[item.condition], boxLabel(item.box, item.category)].filter(Boolean);
};

// Short name for messages: "size 10M/11.5W" or "PSA 10"
export const sellItemShort = (item) => (item.category === "trading_cards" ? sellItemDetails(item)[0] : `size ${item.size}`);
