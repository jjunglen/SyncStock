const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const PushSubscription = sequelize.define(
  "PushSubscription",
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
      allowNull: false,
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    p256dh: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    auth: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "push_subscriptions",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["store_id"] }],
  },
);

module.exports = PushSubscription;
