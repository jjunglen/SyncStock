const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// One shopper search on a store's site (searchLog.service.js), for the
// platform admin's "What shoppers search" monitor. No names or emails:
// `visitor` is an account id or an anonymous hash, only used to merge
// one person's typing ("jor", "jordan 4") into a single row. Rows older
// than 90 days are deleted nightly (server.js).
const SearchLog = sequelize.define(
  "SearchLog",
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
    visitor: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    query: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    // How many items matched (0 = nothing in stock for it)
    results: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // "exact", or "close" when only near matches were shown
    match: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    // "browse" (the shop's search bars) or "track" (Track a new item)
    source: {
      type: DataTypes.STRING(12),
      allowNull: false,
      defaultValue: "browse",
    },
  },
  {
    tableName: "search_logs",
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ["created_at"] }, { fields: ["store_id", "created_at"] }, { fields: ["visitor", "updated_at"] }],
  },
);

module.exports = SearchLog;
