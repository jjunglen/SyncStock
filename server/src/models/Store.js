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
    // The store's activated Syncstock web pixel (set on Shopify connect).
    // Null means the pixel isn't running, so only cart-tagged sales count.
    web_pixel_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Set by the app/uninstalled webhook (store goes offline); cleared
    // when they reinstall. shop/redact deletes the store 48 hours after.
    uninstalled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Which categories shoppers see (utils/storeSettings.js). Hidden
    // categories drop out of the shopper site and never send alerts.
    enabled_categories: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: ["sneakers", "clothing"],
    },
    // Branding: a small logo image (served by GET /api/store/logo/:id)
    // and an accent color for buttons on the shopper site and emails.
    // logo_data is left out of normal queries — see defaultScope.
    logo_data: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    logo_mime: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    logo_updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    brand_color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: { is: /^#[0-9a-f]{6}$/i },
    },
    // Shopify billing (billing.service.js): exempt (flagship store),
    // pending, active, cancelled, declined, expired or frozen
    billing_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    shopify_subscription_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // First paid activation — a store only gets the free trial once
    billing_started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Monday "most wanted sizes" email to the store's admins
    weekly_report: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    // Stores are looked up on almost every request; don't drag the logo
    // image along. Read it with Store.unscoped() where it's needed.
    defaultScope: { attributes: { exclude: ["logo_data"] } },
},
);

module.exports = Store;
