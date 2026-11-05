const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration: adds stores.channel_connected_at (when the merchant
// last connected the SyncStock sales channel), so reconnecting doesn't
// send restock alerts for items that were already in stock. Additive
// only. Run it BEFORE deploying the code that reads it. Safe to run more
// than once.
//
// Usage: node src/scripts/migrateChannelConnectedAt.js
const run = async () => {
  await sequelize.query(`ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS channel_connected_at TIMESTAMPTZ`);
  console.log("stores.channel_connected_at added");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
