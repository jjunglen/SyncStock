const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// "This shopper looked at this product" — one row per shopper per product
// (all its sizes), refreshed on every look. Powers the product pop-out's
// "3 people viewed this in the last 24 hours". Only ever counted, never
// listed; rows older than 7 days are deleted nightly (server.js).
const ProductView = sequelize.define(
  "ProductView",
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
    shopify_product_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    account_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    viewed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "product_views",
    underscored: true,
    timestamps: false,
    indexes: [
      { unique: true, fields: ["store_id", "shopify_product_id", "account_id"] },
      { fields: ["store_id", "shopify_product_id", "viewed_at"] },
    ],
  },
);

module.exports = ProductView;
