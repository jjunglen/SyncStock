const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for the theme check (services/themeSetup.service.js):
//   stores.theme_status          — what SyncStock last saw in the store's
//                                  live Shopify theme (floating button on,
//                                  Restock alerts section on the home page)
//   stores.theme_prompt_sent_for — the theme we last emailed the merchant
//                                  about, so it's one email per theme
// Additive only. Run it BEFORE deploying the code that reads them (the
// Store model lists them, so every store query needs the columns). Safe
// to run more than once.
//
// Usage: node src/scripts/migrateThemeStatus.js
const run = async () => {
  await sequelize.query(`ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS theme_status JSONB`);
  await sequelize.query(`ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS theme_prompt_sent_for VARCHAR(64)`);
  console.log("Done — stores.theme_status and stores.theme_prompt_sent_for added.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
