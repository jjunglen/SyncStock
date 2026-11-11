const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// One alert email sent to a shopper (digest.service.js), and whether
// they clicked it: every link in the email carries this id in its
// sign-in token, so the first click sets first_clicked_at
// (auth.controller.js emailLinkLogin). For the platform admin's email
// numbers; no addresses are kept here.
const AlertEmail = sequelize.define(
  "AlertEmail",
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
    account_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // Products in the email
    items: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    first_clicked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    clicks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "alert_emails",
    underscored: true,
    timestamps: false,
    indexes: [{ fields: ["sent_at"] }, { fields: ["store_id", "sent_at"] }],
  },
);

module.exports = AlertEmail;
