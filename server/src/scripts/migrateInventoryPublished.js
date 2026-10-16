const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration: inventory.published — whether the product is live
// on the Online Store, so product updates only send alerts when an item
// goes live or comes back in stock (not on every edit, e.g. a bulk
// location change). Filled by product webhooks and the catalog sync.
// Additive; safe for older deployed code and safe to re-run.
//
// Run BEFORE starting a server with the updated models.
//
// Usage: node src/scripts/migrateInventoryPublished.js
const run = async () => {
  await sequelize.query(`ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS published BOOLEAN`);
  console.log("Done — inventory.published is in place.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
