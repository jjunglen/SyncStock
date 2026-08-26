const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// Per-store membership — not identity. One Account can have many
// User rows, one per store.
const User = sequelize.define(
  "User",
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
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    notify_size_alerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    notify_inapp: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Store-specific: admin at one store, regular user elsewhere.
    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
    },
  },
  {
    tableName: "users",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    // One membership per account per store.
    indexes: [{ unique: true, fields: ["account_id", "store_id"] }],
  },
);

module.exports = User;
