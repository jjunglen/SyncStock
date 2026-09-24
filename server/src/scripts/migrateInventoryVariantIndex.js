const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration: inventory used to be unique on
// (store_id, shopify_product_id), so every size of a product overwrote
// the previous one. Moves uniqueness to (store_id, shopify_variant_id).
// sequelize.sync() can't do this itself — the new non-unique product
// index has the same auto-generated name as the old unique one.
// Safe to run more than once.
//
// Usage: node src/scripts/migrateInventoryVariantIndex.js
const run = async () => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `DROP INDEX IF EXISTS inventory_store_id_shopify_product_id`,
      { transaction },
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS inventory_store_id_shopify_product_id
         ON inventory (store_id, shopify_product_id)`,
      { transaction },
    );
    await sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS inventory_store_id_shopify_variant_id
         ON inventory (store_id, shopify_variant_id)`,
      { transaction },
    );
  });

  console.log(
    "Done — inventory is now unique per variant. Re-run the Shopify backfill to restore sizes that were overwritten.",
  );
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
