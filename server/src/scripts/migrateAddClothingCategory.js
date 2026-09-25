const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration: adds "clothing" to the category enums. Additive
// only — existing rows and older deployed code are unaffected.
// Safe to run more than once.
//
// Usage: node src/scripts/migrateAddClothingCategory.js
const TYPES = [
  "enum_inventory_category",
  "enum_alerts_category",
  "enum_purchases_category",
];

const run = async () => {
  for (const type of TYPES) {
    await sequelize.query(
      `ALTER TYPE "${type}" ADD VALUE IF NOT EXISTS 'clothing' BEFORE 'trading_cards'`,
    );
    console.log(`${type}: clothing added`);
  }
  console.log(
    "Done. Next: node src/scripts/recategorizeInventory.js (dry run) to sort existing items.",
  );
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
