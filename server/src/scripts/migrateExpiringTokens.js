const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../models/index.js");

// One-time migration for Shopify's expiring offline tokens
// (utils/shopifyToken.js):
//   shopify_refresh_token      — encrypted; renews the access token
//   shopify_token_expires_at   — when the access token stops working (~1 hour)
//   shopify_refresh_expires_at — when the refresh token does (90 days)
// Stores with no expiry (The Laboratory's original token) keep working as
// they are. Additive; safe to re-run.
//
// Usage: node src/scripts/migrateExpiringTokens.js
const STATEMENTS = [
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shopify_refresh_token TEXT`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shopify_token_expires_at TIMESTAMPTZ`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shopify_refresh_expires_at TIMESTAMPTZ`,
];

const run = async () => {
  await sequelize.transaction(async (transaction) => {
    for (const sql of STATEMENTS) {
      await sequelize.query(sql, { transaction });
    }
  });
  console.log("Done — expiring token columns are in place.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
