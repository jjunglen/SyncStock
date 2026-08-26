const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// Stores confirmed purchases matched via Shopify orders/create webhooks.
const Purchase = sequelize.define(
  "Purchase",
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment:
        "Nullable in case customer email doesn't match a registered user",
    },
    alert_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    shopify_order_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Order id from Shopify - unique per store, not globally",
    },
    shoe_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    price_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    customer_email: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "From Shopify order payload - used to match registered users",
    },
    purchased_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "purchases",
    underscored: true,
    timestamps: false,
    indexes: [
      { unique: true, fields: ["store_id", "shopify_order_id"] },
      { fields: ["store_id"] },
    ],
  },
);

module.exports = Purchase;
