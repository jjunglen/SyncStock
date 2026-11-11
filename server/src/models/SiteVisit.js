const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// One person on one store's site on one day, and their device
// (visit.service.js) — for the platform admin's mobile vs desktop split.
// No names or emails: `visitor` is an account id or an anonymous hash.
// Rows older than 90 days are deleted nightly (server.js).
const SiteVisit = sequelize.define(
  "SiteVisit",
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
    day: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // "mobile", "tablet" or "desktop"
    device: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
  },
  {
    tableName: "site_visits",
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ["store_id", "visitor", "day"] }, { fields: ["day"] }],
  },
);

module.exports = SiteVisit;
