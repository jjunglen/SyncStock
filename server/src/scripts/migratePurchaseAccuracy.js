const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../models/index.js");

// One-time migration for more accurate sales (attribution.service.js):
//   refunded_amount — how much of price_paid Shopify refunded (0 = none)
//   cancelled_at    — the order was cancelled
//   match_type      — "exact": the size clicked was bought (counts as a
//                     sale); "product": a different size or condition of
//                     the clicked product ("Assisted", shown separately)
// Existing sales are exact and unrefunded. Additive; safe to re-run.
//
// Usage: node src/scripts/migratePurchaseAccuracy.js
const STATEMENTS = [
  `ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`,
  `ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS match_type VARCHAR(10) NOT NULL DEFAULT 'exact'`,
];

const run = async () => {
  await sequelize.transaction(async (transaction) => {
    for (const sql of STATEMENTS) await sequelize.query(sql, { transaction });
  });
  console.log("Done — purchases have refunded_amount, cancelled_at and match_type.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
