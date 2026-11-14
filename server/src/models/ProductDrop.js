const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// When a Coming soon product drops at the store, set by the merchant
// (Store settings → Coming soon page). Shown to shoppers on the Coming
// soon page; shoppers with an alert for it get a reminder about an hour
// before (dropReminder.service.js — reminded_at marks it sent).
const ProductDrop = sequelize.define(
  "ProductDrop",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    store_id: { type: DataTypes.UUID, allowNull: false },
    shopify_product_id: { type: DataTypes.STRING, allowNull: false },
    drops_at: { type: DataTypes.DATE, allowNull: false },
    reminded_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "product_drops",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ unique: true, fields: ["store_id", "shopify_product_id"] }, { fields: ["drops_at"] }],
  },
);

module.exports = ProductDrop;
