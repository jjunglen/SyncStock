const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const StockxImageCache = sequelize.define(
  "StockxImageCache",
  {
    url_key: {
      type: DataTypes.TEXT,
      primaryKey: true,
    },
    // null = no photo found (tried again after a week — stockxImages.service.js)
    image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "stockx_image_cache",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = StockxImageCache;
