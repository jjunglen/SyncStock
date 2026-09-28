const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// Stores every time a user clicks a notification link
const AlertClick = sequelize.define(
  "AlertClick",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    alert_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    notification_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    inventory_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // The exact Shopify variant clicked — orders are matched on this
    shopify_variant_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Where the click came from: buy_now (popup), later email/push/sms
    channel: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    product_name: {
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
    clicked_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "alert_clicks",
    underscored: true,
    timestamps: false,
    indexes: [{ fields: ["store_id"] }],
  },
);

module.exports = AlertClick;
