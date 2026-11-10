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
