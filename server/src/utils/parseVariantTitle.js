const youthToAdult = {
  "3.5Y": "3.5M/5W",
  "4Y": "4M/5.5W",
  "4.5Y": "4.5M/6W",
  "5Y": "5M/6.5W",
  "5.5Y": "5.5M/7W",
  "6Y": "6M/7.5W",
  "6.5Y": "6.5M/8W",
  "7Y": "7M/8.5W",
};

// Helper function that extracts size, condition, and box status
const parseVariantTitle = (variantTitle, productHandle = "") => {
  const splitTitle = variantTitle.split(" - ").map((part) => part.trim());

  let size = splitTitle[0];
  const itemCondition = splitTitle[1] || null;
  const boxCondition = splitTitle[2] || "Original Box (Good)";

  // Convert youth size to adult equivalent
  if (youthToAdult[size]) {
    size = youthToAdult[size];
  }

  // match condition to the ENUM value
  let condition = "either";
  if (itemCondition === "Brand New") condition = "brand_new";
  if (itemCondition === "Pre-Owned") condition = "pre_owned";

  // Fall back to product handle if variant title doesnt have condition
  if (condition === "either" && productHandle) {
    if (productHandle.startsWith("brand-new-")) condition = "brand_new";
    if (productHandle.startsWith("pre-owned-")) condition = "pre_owned";
  }

  return { size, condition, boxCondition };
};

module.exports = { parseVariantTitle };
