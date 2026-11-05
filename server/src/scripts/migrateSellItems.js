const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// "Sell your items" (beta) store settings:
//   sell_enabled                — shoppers can send pairs to sell
//   buy_margin_new / _used      — margins for suggested offers (%)
//   credit_bonus                — extra % for store credit (0 = cash only)
// plus the store each imported sale belongs to (sales_history.store_id,
// only if that table already exists — new installs get it from sync).
// The sell_requests / sell_items / sell_photos tables are new and are
// created by the server's model sync.
// Additive only; safe for older deployed code and safe to re-run.
//
// Run BEFORE starting a server with the updated Store model.
//
// Usage: node src/scripts/migrateSellItems.js
const STATEMENTS = [
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS sell_enabled BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS buy_margin_new INTEGER NOT NULL DEFAULT 30`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS buy_margin_used INTEGER NOT NULL DEFAULT 40`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS credit_bonus INTEGER NOT NULL DEFAULT 10`,
  `ALTER TABLE IF EXISTS public.sales_history ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE`,
];

const run = async () => {
  await sequelize.transaction(async (transaction) => {
    for (const sql of STATEMENTS) {
      await sequelize.query(sql, { transaction });
    }
  });
  console.log("Done — sell-your-items columns are in place.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
