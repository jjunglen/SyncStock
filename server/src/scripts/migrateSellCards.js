const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration: adds sell_items.card (a trading card's type, raw
// condition, grading company, grade and cert number, for "Sell your
// items"). Additive only. Run it BEFORE deploying the code that reads it.
// Safe to run more than once.
//
// Usage: node src/scripts/migrateSellCards.js
const run = async () => {
  await sequelize.query(`ALTER TABLE public.sell_items ADD COLUMN IF NOT EXISTS card JSONB`);
  console.log("sell_items.card added");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
