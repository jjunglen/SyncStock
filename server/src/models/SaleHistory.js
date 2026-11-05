const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// The Lab's past sales (its "All Items Sold" sheet, uploaded as CSV on the
// platform admin page — salesHistory.service.js). What each pair sold for
// and what was paid for it: the baseline for trade-in offers.
const SaleHistory = sequelize.define(
  "SaleHistory",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // The store these sales belong to — each store's history prices only
    // its own offers (never shared with other stores)
    store_id: { type: DataTypes.UUID, allowNull: true },
    // Fingerprint of the row — uploading the same sale twice adds it once
    row_key: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    size: { type: DataTypes.TEXT, allowNull: true },
    // Size for matching ("Large" and "L" are the same)
    size_key: { type: DataTypes.TEXT, allowNull: true },
    // The SKU used for matching — typos fixed, or borrowed from the same
    // title (utils/skuMatch.js); raw_style_code is the sheet as written
    style_code: { type: DataTypes.TEXT, allowNull: true },
    raw_style_code: { type: DataTypes.TEXT, allowNull: true },
    // sku | fixed_sku | borrowed_sku | title
    matched_by: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "sku" },
    // new | used (worn, VNDS, tried on)
    condition: { type: DataTypes.STRING(8), allowNull: false },
    // The sheet's note as written ("WORN - NO BOX")
    condition_note: { type: DataTypes.TEXT, allowNull: true },
    // No box, replacement box, damaged box or missing lid
    box_issue: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // in_store | ebay | website | goat | stockx | other (Whatnot isn't imported)
    channel: { type: DataTypes.STRING(16), allowNull: false },
    channel_note: { type: DataTypes.TEXT, allowNull: true },
    // What the sheet says (eBay: the payout after eBay's fee)
    net_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    // What the buyer paid (eBay's fee added back; other channels as is)
    sale_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    bought_on: { type: DataTypes.DATEONLY, allowNull: true },
    sold_on: { type: DataTypes.DATEONLY, allowNull: false },
    // Set when the row looks wrong (e.g. a likely price typo) — kept, but
    // left out of price guides
    flag: { type: DataTypes.TEXT, allowNull: true },
    source_file: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "sales_history",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["store_id", "style_code"] }, { fields: ["sold_on"] }],
  },
);

module.exports = SaleHistory;
