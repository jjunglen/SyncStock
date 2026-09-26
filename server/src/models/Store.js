const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const { encrypt, decrypt } = require("../utils/encryption.js");


const Store = sequelize.define(
"Store",
{
    id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    },
    name: {
    type: DataTypes.STRING,
    allowNull: false,
    },
    shopify_domain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    },
    storefront_url: {
    type: DataTypes.STRING,
    allowNull: false,
    },
    shopify_access_token: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
        const raw = this.getDataValue("shopify_access_token");
        return raw ? decrypt(raw) : raw;
    },
    set(value) {
        this.setDataValue(
        "shopify_access_token",
        value ? encrypt(value) : value,
        );
    },
    },
    shopify_webhook_secret: {
        type: DataTypes.STRING,
        allowNull: true,
        get() {
            const raw = this.getDataValue("shopify_webhook_secret");
            return raw ? decrypt(raw) : raw;
        },
        set(value) {
            this.setDataValue(
            "shopify_webhook_secret",
            value ? encrypt(value) : value,
            );
    },
    },
    notification_from_email: {
    type: DataTypes.STRING,
    allowNull: true,
    },
    plan: {
    type: DataTypes.ENUM("pro", "internal"),
    allowNull: true,
    },
    // Where the merchant is in onboarding, so they can leave and come
    // back: account → subdomain → plan → complete. The store only goes
    // live (status "active") at complete.
    onboarding_step: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "account",
      validate: { isIn: [["account", "subdomain", "plan", "complete"]] },
    },
    // Text alerts on/off for the whole store — set by the plan step
    sms_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
    type: DataTypes.ENUM("pending", "active", "suspended"),
    defaultValue: "pending",
    },
    subdomain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    },
},
{
    tableName: "stores",
    timestamps: true,
    underscored: true,
},
);

module.exports = Store;
