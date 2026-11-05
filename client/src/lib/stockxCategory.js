// StockX product types → our category, so picking a hoodie switches to
// clothing sizes on its own (Track a new item, Sell your items)
export const categoryFromStockx = (item) => {
  const type = `${item?.productType || ""} ${item?.productAttributes?.category || ""}`;
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
