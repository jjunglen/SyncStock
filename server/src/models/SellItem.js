const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// One pair in a sell request. Kept after the photos are deleted: the item
// details and prices feed the store's price guide later.
const SellItem = sequelize.define(
  "SellItem",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    request_id: { type: DataTypes.UUID, allowNull: false },
    store_id: { type: DataTypes.UUID, allowNull: false },
    product_name: { type: DataTypes.TEXT, allowNull: false },
    // From StockX search (null for "describe it" items)
    style_code: { type: DataTypes.TEXT, allowNull: true },
    stockx_product_id: { type: DataTypes.TEXT, allowNull: true },
    image_url: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "sneakers" },
    size: { type: DataTypes.STRING(20), allowNull: false },
    // new | used
    condition: { type: DataTypes.STRING(8), allowNull: false },
    // original | damaged | none (sealed cards: original = factory sealed)
    box: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "original" },
    // Trading cards only: { type: raw | graded | sealed, raw_condition,
    // grading_company, grade, cert_number }. condition holds the type and
    // size a short label ("NM", "PSA 10", "Sealed").
    card: { type: DataTypes.JSONB, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    asking_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    // The price guide's suggestion when the request was sent
    suggested_offer: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    suggestion: { type: DataTypes.JSONB, allowNull: true },
    // The store's offer for this pair (null with offer_skipped = passed on it)
    offer_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    offer_skipped: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // The shopper's answer: accepted | declined
    decision: { type: DataTypes.STRING(10), allowNull: true },
    // What the store paid when the pair came in (cash, or credit value)
    paid_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    received_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "sell_items",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["request_id"] }, { fields: ["store_id", "style_code"] }],
  },
);

module.exports = SellItem;
