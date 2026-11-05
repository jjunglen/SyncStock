const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

// A photo of a pair, stored in Supabase Storage (sellPhotos.service.js)
// only until the pair is dropped off, declined or expired — then the file
// and this row are deleted.
const SellPhoto = sequelize.define(
  "SellPhoto",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    item_id: { type: DataTypes.UUID, allowNull: false },
    request_id: { type: DataTypes.UUID, allowNull: false },
    store_id: { type: DataTypes.UUID, allowNull: false },
    storage_path: { type: DataTypes.TEXT, allowNull: false },
    mime: { type: DataTypes.STRING(20), allowNull: false },
    bytes: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "sell_photos",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["item_id"] }, { fields: ["request_id"] }],
  },
);

module.exports = SellPhoto;
