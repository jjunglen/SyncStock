const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize, Store } = require("../models/index.js");
const { isBillingExempt } = require("../services/billing.service.js");

// One-time migration for Shopify billing (billing.service.js):
//   billing_status          — exempt | pending | active | cancelled | declined | expired | frozen
//   shopify_subscription_id — the store's current Shopify subscription
//   billing_started_at      — first paid activation (no second trial)
// Then marks stores owned by a billing-exempt account (the flagship
// store) as plan "internal". Additive; safe to re-run.
//
// Usage: node src/scripts/migrateBilling.js
const STATEMENTS = [
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS billing_status VARCHAR(20)`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shopify_subscription_id VARCHAR(255)`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS billing_started_at TIMESTAMPTZ`,
];

const run = async () => {
  await sequelize.transaction(async (transaction) => {
    for (const sql of STATEMENTS) {
      await sequelize.query(sql, { transaction });
    }
  });

  for (const store of await Store.findAll()) {
    if (await isBillingExempt(store)) {
      await store.update({ plan: "internal", billing_status: "exempt" });
      console.log(`${store.subdomain}: billing-exempt (plan internal)`);
    }
  }
  console.log("Done — billing columns are in place.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
