const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for the pre-launch store settings:
//   uninstalled_at      — set by the app/uninstalled webhook
//   enabled_categories  — which categories shoppers see
//   logo_*, brand_color — store branding
//   weekly_report       — Monday "most wanted sizes" email
// Additive only; safe for older deployed code and safe to re-run.
//
// Run BEFORE starting a server with the updated Store model.
//
// Usage: node src/scripts/migrateStoreSettings.js
const STATEMENTS = [
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMPTZ`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS enabled_categories VARCHAR(255)[] NOT NULL DEFAULT ARRAY['sneakers','clothing']::VARCHAR(255)[]`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_data BYTEA`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_mime VARCHAR(20)`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_updated_at TIMESTAMPTZ`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7)`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS weekly_report BOOLEAN NOT NULL DEFAULT true`,
];

const run = async () => {
  await sequelize.transaction(async (transaction) => {
    for (const sql of STATEMENTS) {
      await sequelize.query(sql, { transaction });
    }
  });
  console.log("Done — store settings columns are in place.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
