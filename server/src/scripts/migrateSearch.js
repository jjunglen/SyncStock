const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time: turns on Postgres's pg_trgm extension (similarity matching)
// for the inventory search's "close matches" fallback
// (utils/inventorySearch.js), and indexes product names for it. Installed
// in Supabase's "extensions" schema. Additive; safe to re-run.
//
// Usage: node src/scripts/migrateSearch.js
const STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions`,
  `CREATE INDEX IF NOT EXISTS inventory_product_name_trgm
     ON public.inventory USING gin (lower(product_name) extensions.gin_trgm_ops)`,
];

const run = async () => {
  for (const sql of STATEMENTS) await sequelize.query(sql);
  console.log("Done — similarity search is on and product names are indexed.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
