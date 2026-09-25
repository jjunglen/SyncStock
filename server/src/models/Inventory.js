const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const Inventory = sequelize.define(
  "Inventory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    store_id: { type: DataTypes.UUID, allowNull: false },
    shopify_product_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Product id from Shopify - unique per store, not globally",
    },
    shopify_variant_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Variant id from Shopify - each size/variant is a variant",
    },
    // What kind of product this is — decides how attributes below gets
    category: {
      type: DataTypes.ENUM("sneakers", "clothing", "trading_cards"),
      allowNull: false,
      defaultValue: "sneakers",
    },
    product_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sku: { type: DataTypes.STRING, allowNull: true },
    size: { type: DataTypes.STRING, allowNull: true },
    condition: { type: DataTypes.STRING, allowNull: true },
    box_status: { type: DataTypes.STRING, allowNull: true },
    attributes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    compare_at_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    available: { type: DataTypes.INTEGER, defaultValue: 0 },
    shopify_url: { type: DataTypes.STRING, allowNull: true },
    image_url: { type: DataTypes.STRING, allowNull: true },
    last_synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    is_graded: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    grading_company: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        "PSA, BGS, CGC, SGC, TAG, etc. — validated list in validate.js, not an ENUM, so adding a new company never needs a migration",
    },
    grade: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        "String not decimal — needs to hold values like '10', '9.5', or 'BGS 10 Black Label'",
    },
    cert_number: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        "The grading company's serial/certification number, for authenticity lookup",
    },
    image_urls: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment:
        "All product images from Shopify, in order — image_url stays as the first one for backward compatibility with cards/emails/push",
    },
  },

  {
    tableName: "inventory",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      // One row per variant (size), so uniqueness is on the variant id —
      // keying on product id made each size overwrite the previous one
      { unique: true, fields: ["store_id", "shopify_variant_id"] },
      { fields: ["store_id", "shopify_product_id"] },
      { fields: ["store_id"] },
      { fields: ["store_id", "category"] },
    ],
  },
);

module.exports = Inventory;
