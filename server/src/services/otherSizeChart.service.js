const { Op, fn, col } = require("sequelize");
const { Inventory } = require("../models/index.js");
const { otherSizeSettings, cleanSizeList } = require("../utils/otherSizes.js");

// The size chart shoppers see for the "other" category. The merchant's
// own (Size settings) when they've saved one; until then, built
// automatically from the sizes their "other" products have — which only
// come from real size options (utils/variantDetails.js), never colors.
// So a store gets working sizes with no setup.

// "7 3/8" → 7.375, "158cm" → 158, "M" → NaN
const sizeNumber = (size) => {
  const m = /^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?/.exec(String(size).trim());
  if (!m) return NaN;
  return Number(m[1]) + (m[2] ? Number(m[2]) / Number(m[3]) : 0);
};

// Placeholder text some listing tools leave in size fields
const PLACEHOLDER = /:|^n\/?a$|^none$|^default/i;

// Numbers by value (148, 152, 158…; 7 1/8 before 7 1/4), then the rest
const byValue = (a, b) => {
  const na = sizeNumber(a);
  const nb = sizeNumber(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
};

// → { label, sizes, option_names, automatic }
const otherSizeChart = async (store) => {
  const settings = otherSizeSettings(store);
  if (settings.sizes.length) return { ...settings, automatic: false };
  const rows = await Inventory.findAll({
    where: { store_id: store.id, category: "other", size: { [Op.ne]: null } },
    attributes: [[fn("DISTINCT", col("size")), "size"]],
    raw: true,
  });
  const sizes = cleanSizeList(rows.map((r) => r.size).filter((size) => !PLACEHOLDER.test(size)).sort(byValue));
  return { ...settings, sizes, automatic: true };
};

module.exports = { otherSizeChart, byValue };
