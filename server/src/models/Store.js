const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const Store = sequelize.define("Store", {
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

    },
    shopify_webhook_secret: {
        type: DataTypes.STRING,
        allowNull: false,

    },
    notification_from_email: {
        type: DataTypes.STRING,
        allowNull: true,

    },
    plan: {
        type: DataTypes.ENUM("free", "starter", "pro", "internal"),
        allowNull: true,

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
    
}, {
        tableName: "stores",
        timestamps: true,
        underscored: true,  
    }
);

module.exports = Store;
