const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for the Coming soon page:
//   stores.coming_soon     — the merchant turned the page on (off by default)
//   inventory.online_store — the product is live on the store's own
//                            website (Shopify's published_at). Sales-channel
//                            stores use "published" for the SyncStock
//                            channel, so this tells coming-soon items
//                            (not on the website yet) from sold-out ones.
//                            Null until the next catalog sync fills it.
// Additive only. Run it BEFORE deploying the code that reads it. Safe to
// run more than once.
//
// Usage: node src/scripts/migrateComingSoon.js
const run = async () => {
  await sequelize.query(
    `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS coming_soon BOOLEAN NOT NULL DEFAULT false`,
  );
  console.log("stores.coming_soon added");
  await sequelize.query(`ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS online_store BOOLEAN`);
  console.log("inventory.online_store added");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
