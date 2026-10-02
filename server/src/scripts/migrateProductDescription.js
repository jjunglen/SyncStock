const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../models/index.js");

// One-time migration: inventory.description — the product's Shopify
// description as plain text, for the "Details" panel on product cards.
// Filled by the catalog sync (nightly, or on connect) and product
// webhooks. Additive; safe to re-run.
//
// Usage: node src/scripts/migrateProductDescription.js
const run = async () => {
  await sequelize.query(`ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS description TEXT`);
  console.log("Done — inventory.description is in place.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
