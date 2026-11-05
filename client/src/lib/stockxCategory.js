// StockX product types → our category, so picking a hoodie switches to
// clothing sizes on its own (Track a new item, Sell your items)
const CARD_WORDS =
  /\b(pok[eé]mon|tcg|trading card|yu-?gi-?oh|magic the gathering|one piece card|lorcana|topps|panini|upper deck|bowman|psa|bgs|cgc|graded|booster|elite trainer)\b/i;
const SEALED_WORDS =
  /\b(elite trainer box|etb|booster (box|pack|bundle|display|case)|blister|collection box|premium collection|tin|display box|hobby box|blaster|sealed)\b/i;

// A StockX card's kind for the card picker: sealed product, or null
// (a single, raw or graded)
export const cardKindsFromStockx = (item) => (SEALED_WORDS.test(item?.title || "") ? ["sealed"] : null);

export const categoryFromStockx = (item) => {
  const type = `${item?.productType || ""} ${item?.productAttributes?.category || ""}`;
  if (/trading.?card/i.test(type)) return "trading_cards";
  // StockX files cards and sealed boxes under "collectibles"
  if (/collectible/i.test(type) && CARD_WORDS.test(`${item?.title || ""} ${item?.brand || ""}`)) return "trading_cards";
  if (/apparel|clothing|streetwear|accessor|hoodie|shirt|jacket|pants|shorts|hat|bag/i.test(type)) return "clothing";
  if (/sneaker|shoe|footwear/i.test(type)) return "sneakers";
  return null;
};

// A grade-school (GS) shoe: StockX puts "(GS)" in the name, or lists it
// as a child's product (preschool and toddler sizes are separate)
export const isGradeSchool = (item) =>
  /\(GS\)|\bGS\b/.test(item?.title || "") ||
  /grade school/i.test(item?.title || "") ||
  /^(child|youth)$/i.test(item?.productAttributes?.gender || "");
