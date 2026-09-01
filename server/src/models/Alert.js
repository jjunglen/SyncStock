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
    store_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    category: {
      type: DataTypes.ENUM("sneakers", "trading_cards"),
      allowNull: false,
      defaultValue: "sneakers",
    },
    stockx_product_id: { type: DataTypes.STRING, allowNull: true },
    product_name: { type: DataTypes.STRING, allowNull: false },
    sku: { type: DataTypes.STRING, allowNull: true },
    stockx_url_key: { type: DataTypes.STRING, allowNull: true },
    size: { type: DataTypes.STRING, allowNull: true },
    condition_preference: {
      type: DataTypes.ENUM("brand_new", "pre_owned", "either"),
      defaultValue: "either",
    },
    box_preference: {
      type: DataTypes.ENUM("original_good", "any", "no_preference"),
      defaultValue: "no_preference",
    },
    attributes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    max_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    notify_email: { type: DataTypes.BOOLEAN, defaultValue: true },
    notify_inapp: { type: DataTypes.BOOLEAN, defaultValue: true },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    graded_preference: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "either",
      comment: "'graded', 'raw', or 'either' — validated in validate.js",
    },
    preferred_grading_company: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "null means any grading company is acceptable",
    },
    min_grade: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Minimum acceptable grade, e.g. '9' — string to allow half-grades like '9.5'",
    },
  },
  {
    tableName: "alerts",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = Alert;
