const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for Coming soon drop times:
//   product_drops — when each Coming soon product drops at the store (set
//                   by the merchant), and when its one-hour reminder went
//                   out. Row level security on, like the other tables
//                   (the server connects as the owner, so it's unaffected).
// Additive only. Run it BEFORE deploying the code that reads it. Safe to
// run more than once.
//
// Usage: node src/scripts/migrateProductDrops.js
const run = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.product_drops (
      id UUID PRIMARY KEY,
      store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
      shopify_product_id VARCHAR(255) NOT NULL,
      drops_at TIMESTAMPTZ NOT NULL,
      reminded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
  await sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS product_drops_store_id_shopify_product_id ON public.product_drops (store_id, shopify_product_id)`,
  );
  await sequelize.query(`CREATE INDEX IF NOT EXISTS product_drops_drops_at ON public.product_drops (drops_at)`);
  await sequelize.query(`ALTER TABLE public.product_drops ENABLE ROW LEVEL SECURITY`);
  console.log("product_drops ready");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
