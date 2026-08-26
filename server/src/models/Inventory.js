const { DataTypes, UUIDV4, STRING } = require("sequelize");
const { sequelize } = require("../config/database.js");

// Stores inventory synced from shopify via webhook

const Inventory = sequelize.define(
  "Inventory",
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
    shopify_product_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment:
        "Unique product id from Shopify - unique per store, not globally",
    },
    shopify_variant_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Variant id from shopify - each size is a varient",
    },
    shoe_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    available: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "stock quantity - 0 means out of stock",
    },
    condition: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "brand new or pre owned parsed from shopify variant title",
    },
    box_status: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Box condition - parsed from shopify variant title",
    },
    shopify_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Direct link to the product on your shopify store",
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Product image pull from shopify",
    },
    compare_at_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    last_synced_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "Last time this record was updated from Shopify",
    },
  },
  {
    tableName: "inventory",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { unique: true, fields: ["store_id", "shopify_product_id"] },
      { fields: ["store_id"] },
    ],
  },
);

module.exports = Inventory;
