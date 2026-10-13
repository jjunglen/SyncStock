const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// A phone with the SyncStock app that can receive notifications. The
// token comes from Firebase Cloud Messaging; one per app install. Per
// account, not per store — the app covers every store the shopper uses.
const DeviceToken = sequelize.define(
  "DeviceToken",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    account_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    platform: {
      type: DataTypes.STRING(10), // "ios" | "android"
      allowNull: false,
    },
  },
  {
    tableName: "device_tokens",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["account_id"] }],
  },
);

module.exports = DeviceToken;
