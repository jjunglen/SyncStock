const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for "Good deal" badges (services/dealBadge.service.js):
//   stores.deal_badges — the merchant turned the 🔥 badges on (off by default)
// Additive only. Run it BEFORE deploying the code that reads it. Safe to
// run more than once.
//
// Usage: node src/scripts/migrateDealBadges.js
const run = async () => {
  await sequelize.query(
    `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS deal_badges BOOLEAN NOT NULL DEFAULT false`,
  );
  console.log("stores.deal_badges added");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
