const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// "Order X came from click Y", reported by the store's web pixel when a
// checkout completes. Kept because the pixel and the orders/create
// webhook can arrive in either order — whichever lands second finds the
// other and attributes the sale (see attribution.service.js).
const PixelClaim = sequelize.define(
  "PixelClaim",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    shopify_order_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    click_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "pixel_claims",
    underscored: true,
    timestamps: false,
    indexes: [
      { unique: true, fields: ["store_id", "shopify_order_id", "click_id"] },
    ],
  },
);

module.exports = PixelClaim;
