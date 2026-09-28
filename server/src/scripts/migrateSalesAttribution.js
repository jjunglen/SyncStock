const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for tag-only sales attribution + the web pixel:
//   alert_clicks  — which exact variant was clicked, and from where
//   purchases     — which click proved the sale, and how it arrived;
//                   one row per ITEM in an order (was one per order, so
//                   a second matched item in the same order failed)
//   pixel_claims  — "order X came from click Y" reports from the pixel
//   stores        — the store's activated web pixel
// Additive apart from swapping the purchases unique index; safe to
// re-run. Run it again after deploying if Railway restarted on older
// code in between (older code recreates the per-order index on boot).
//
// Usage: node src/scripts/migrateSalesAttribution.js
const STATEMENTS = [
  `ALTER TABLE public.alert_clicks ADD COLUMN IF NOT EXISTS inventory_id UUID`,
  `ALTER TABLE public.alert_clicks ADD COLUMN IF NOT EXISTS shopify_variant_id VARCHAR(255)`,
  `ALTER TABLE public.alert_clicks ADD COLUMN IF NOT EXISTS channel VARCHAR(20)`,
  `CREATE INDEX IF NOT EXISTS alert_clicks_store_id ON public.alert_clicks (store_id)`,

  `ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS click_id UUID`,
  `ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS shopify_variant_id VARCHAR(255)`,
  `ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS attribution_source VARCHAR(20)`,
  `DROP INDEX IF EXISTS public.purchases_store_id_shopify_order_id`,
  `CREATE UNIQUE INDEX IF NOT EXISTS purchases_store_order_variant ON public.purchases (store_id, shopify_order_id, shopify_variant_id)`,

  `CREATE TABLE IF NOT EXISTS public.pixel_claims (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
    shopify_order_id VARCHAR(255) NOT NULL,
    click_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS pixel_claims_store_order_click ON public.pixel_claims (store_id, shopify_order_id, click_id)`,

  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS web_pixel_id VARCHAR(255)`,
];

const run = async () => {
  await sequelize.transaction(async (transaction) => {
    for (const sql of STATEMENTS) {
      await sequelize.query(sql, { transaction });
    }
  });
  console.log("Done — sales attribution columns, pixel_claims table and indexes are in place.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
