const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration: adds stores.search_indexing (the merchant lets
// search engines show their shopper site — on by default). Additive
// only. Run it BEFORE deploying the code that reads it. Safe to run more
// than once.
//
// Usage: node src/scripts/migrateSearchIndexing.js
const run = async () => {
  await sequelize.query(
    `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS search_indexing BOOLEAN NOT NULL DEFAULT true`,
  );
  console.log("stores.search_indexing added");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
