const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const Account = sequelize.define(
  "Account",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    sizes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    reset_token: {
      type: DataTypes.STRING,
      allowNull: true,
      
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: true,

    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Hashed with bcrypt - null if using Google OAuth",
    },
    auth_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: "Supabase auth user id - set on Google OAuth login",
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    avatar_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verification_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Text alerts — E.164 format (+15551234567), set by the phone
    // verification flow in twilio.controller.js
    phone_number: { type: DataTypes.STRING(20), allowNull: true },
    phone_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    phone_verification_code: { type: DataTypes.STRING(6), allowNull: true },
    phone_verification_expires: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "accounts",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    validate: {
      mustHaveAuth() {
        if (!this.password && !this.auth_id) {
          throw new Error(
            "Account must have either a password or a Google auth id",
          );
        }
      },
    },
  },
);

module.exports = Account;
