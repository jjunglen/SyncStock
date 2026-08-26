const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const Alert = sequelize.define(
  "Alert",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // NEW: denormalized from user for fast tenant-scoped queries
    // (every alert lookup filters by store_id first)
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    min_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    max_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "alerts",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["store_id"] }, { fields: ["store_id", "user_id"] }],
  }
);

module.exports = Alert;
