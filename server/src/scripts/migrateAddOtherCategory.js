const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for the "other" category (everything that isn't
// shoes, clothing or cards; the merchant can rename it). Additive only —
// existing rows and the code already deployed are unaffected. Run it
// BEFORE deploying the code that sorts products into "other".
// Safe to run more than once.
//   1. adds "other" to the three category enums
//   2. adds stores.other_category_name (the merchant's name for it)
//   3. switches "other" on for every store (a store only shows the tab
//      once it has items there) and makes it on by default for new ones
//
// Usage: node src/scripts/migrateAddOtherCategory.js
const TYPES = ["enum_inventory_category", "enum_alerts_category", "enum_purchases_category"];

const run = async () => {
  for (const type of TYPES) {
    await sequelize.query(`ALTER TYPE "${type}" ADD VALUE IF NOT EXISTS 'other'`);
    console.log(`${type}: other added`);
  }
  await sequelize.query(
    `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS other_category_name VARCHAR(30)`,
  );
  console.log("stores.other_category_name added");
  await sequelize.query(
    `ALTER TABLE public.stores ALTER COLUMN enabled_categories SET DEFAULT ARRAY['sneakers','clothing','other']::VARCHAR(255)[]`,
  );
  const [, result] = await sequelize.query(
    `UPDATE public.stores SET enabled_categories = array_append(enabled_categories, 'other')
     WHERE NOT ('other' = ANY(enabled_categories))`,
  );
  console.log(`"other" switched on for ${result?.rowCount ?? 0} stores`);
  console.log(
    "Done. Existing items are sorted on the next catalog sync (nightly, or on reconnect).",
  );
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
