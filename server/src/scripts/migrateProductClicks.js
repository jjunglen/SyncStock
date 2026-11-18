const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for the platform admin's "Most clicked":
//   product_clicks — one row per person per product per store per day,
//                    with how many times they opened it that day
//                    (productClick.service.js). No names or emails:
//                    `visitor` is an account id or an anonymous hash.
// Row level security on, like the other tables (the server connects as
// the owner, so it's unaffected). Additive only. Run it BEFORE deploying
// the code that writes it. Safe to run more than once.
//
// Usage: node src/scripts/migrateProductClicks.js
const run = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.product_clicks (
      id UUID PRIMARY KEY,
      store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
      shopify_product_id VARCHAR(255) NOT NULL,
      visitor VARCHAR(64) NOT NULL,
      day DATE NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 1,
      source VARCHAR(12) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
  await sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS product_clicks_store_product_visitor_day ON public.product_clicks (store_id, shopify_product_id, visitor, day)`,
  );
  await sequelize.query(`CREATE INDEX IF NOT EXISTS product_clicks_day ON public.product_clicks (day)`);
  await sequelize.query(`ALTER TABLE public.product_clicks ENABLE ROW LEVEL SECURITY`);
  console.log("product_clicks ready");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
