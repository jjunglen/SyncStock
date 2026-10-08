const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// One row per purchased ITEM that a Syncstock click led to. Only sales
// with proof count: the order carried Syncstock's cart tag, or the
// store's web pixel saw the checkout in the browser that clicked
// (attribution.service.js). An email match alone never counts.
const Purchase = sequelize.define(
  "Purchase",
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
      allowNull: true,
      comment:
        "Nullable in case customer email doesn't match a registered user",
    },
    alert_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // The click that proved the sale
    click_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // cart_tag — the order carried syncstock_click_id
    // pixel     — the web pixel reported the checkout (e.g. "Buy it now")
    // utm       — Shopify's visit history shows the shopper arrived from
    //             the click's link (they came back later; nightly check)
    attribution_source: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    shopify_variant_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shopify_order_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Order id from Shopify - unique per store, not globally",
    },
    product_name: { type: DataTypes.STRING, allowNull: true },
    category: {
      type: DataTypes.ENUM("sneakers", "clothing", "trading_cards"),
      allowNull: false,
      defaultValue: "sneakers",
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    price_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    customer_email: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "From Shopify order payload - used to match registered users",
    },
    purchased_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    // How much Shopify refunded of price_paid (set from the order's
    // refunds, so replays can't double-count). Revenue is net of it.
    refunded_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // exact   — the size clicked was bought: a sale
    // product — a different size/condition of the clicked product:
    //           "Assisted", reported separately, never in the main number
    match_type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "exact",
    },
  },
  {
    tableName: "purchases",
    underscored: true,
    timestamps: false,
    indexes: [
      { unique: true, fields: ["store_id", "shopify_order_id", "shopify_variant_id"] },
      { fields: ["store_id"] },
    ],
  },
);

module.exports = Purchase;
