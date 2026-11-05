const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// "Sell your items" (beta): one batch of pairs a shopper wants to sell to
// a store (sell.controller.js). Statuses:
//   draft     — the shopper is still adding pairs
//   submitted — sent; waiting for the store's offer
//   offered   — the store sent an offer; waiting for the shopper
//   accepted  — the shopper took the offer (all or some pairs); bring them in
//   received  — the store got the pairs and paid; photos deleted
//   declined  — the shopper or the store said no; photos deleted
//   expired   — no answer within 30 days; photos deleted
//   cancelled — the shopper withdrew it
const SellRequest = sequelize.define(
  "SellRequest",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    store_id: { type: DataTypes.UUID, allowNull: false },
    // The shopper's membership at this store (users.id); kept as null if
    // they delete their account, so the item records stay
    user_id: { type: DataTypes.UUID, allowNull: true },
    status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "draft" },
    // cash | credit — the shopper's choice; the offer is in this
    payout_method: { type: DataTypes.STRING(8), allowNull: false, defaultValue: "cash" },
    // The store's credit bonus (%) when the offer was made
    credit_bonus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    offer_total: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    // The store's note with its offer ("Black Cat needs a sole photo")
    merchant_message: { type: DataTypes.TEXT, allowNull: true },
    submitted_at: { type: DataTypes.DATE, allowNull: true },
    offered_at: { type: DataTypes.DATE, allowNull: true },
    responded_at: { type: DataTypes.DATE, allowNull: true },
    received_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "sell_requests",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["store_id", "status"] }, { fields: ["user_id"] }],
  },
);

module.exports = SellRequest;
