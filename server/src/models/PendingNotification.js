const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const PendingNotification = sequelize.define(
  "PendingNotification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    store_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    alert_id: { type: DataTypes.UUID, allowNull: true },
    inventory_id: { type: DataTypes.UUID, allowNull: true },
    product_name: { type: DataTypes.STRING, allowNull: true },
    sku: { type: DataTypes.STRING, allowNull: true },
    size: { type: DataTypes.STRING, allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    image_url: { type: DataTypes.TEXT, allowNull: true },
    shopify_url: { type: DataTypes.TEXT, allowNull: true },
    sent: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "pending_notifications",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["store_id", "user_id", "sent"] }],
  },
);

module.exports = PendingNotification;
