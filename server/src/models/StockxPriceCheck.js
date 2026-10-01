const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// One brand-new, original-box pair's StockX comparison for the merchant
// Price check page (priceCheck.service.js). The StockX product/size match
// is kept, so later refreshes only fetch prices.
const StockxPriceCheck = sequelize.define(
  "StockxPriceCheck",
  {
    inventory_id: { type: DataTypes.UUID, primaryKey: true },
    store_id: { type: DataTypes.UUID, allowNull: false },
    style_id: { type: DataTypes.STRING, allowNull: true },
    stockx_product_id: { type: DataTypes.STRING, allowNull: true },
    stockx_variant_id: { type: DataTypes.STRING, allowNull: true },
    // matched | no_product (style code not on StockX) | no_size
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "matched" },
    lowest_ask: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    highest_bid: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    // The store's own active StockX ask for this size, if it has one
    own_ask: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    checked_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "stockx_price_checks",
    underscored: true,
    timestamps: false,
    indexes: [{ fields: ["store_id"] }],
  },
);

module.exports = StockxPriceCheck;
