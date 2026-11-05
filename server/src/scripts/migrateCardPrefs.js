const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration: adds accounts.card_prefs (a shopper's trading card
// preferences from Profile → Your sizes: what they collect, worst raw
// condition, lowest grade per grading company). Additive only. Run it
// BEFORE deploying the code that reads it. Safe to run more than once.
//
// Usage: node src/scripts/migrateCardPrefs.js
const run = async () => {
  await sequelize.query(`ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS card_prefs JSONB NOT NULL DEFAULT '{}'::jsonb`);
  console.log("accounts.card_prefs added");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
