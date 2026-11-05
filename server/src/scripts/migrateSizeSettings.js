const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for Size settings: adds stores.size_settings, where
// each store keeps its size chart for the "other" category (utils/
// otherSizes.js). Additive only — existing rows and the code already
// deployed are unaffected. Run it BEFORE deploying the code that reads it.
// Safe to run more than once.
//
// Usage: node src/scripts/migrateSizeSettings.js
const run = async () => {
  await sequelize.query(
    `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS size_settings JSONB NOT NULL DEFAULT '{}'::jsonb`,
  );
  console.log("stores.size_settings added");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
