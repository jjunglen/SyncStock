const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for the SyncStock phone app:
//   stores.app_listed   — the store opted in to the app's store list
//   accounts.apple_sub  — Sign in with Apple's stable user id
//   device_tokens       — phones to send app notifications to (FCM)
// Additive only; safe for older deployed code and safe to re-run.
//
// Run BEFORE starting a server with the updated models.
//
// Usage: node src/scripts/migrateMobileApp.js
const STATEMENTS = [
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS app_listed BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS apple_sub VARCHAR(255)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS accounts_apple_sub_key ON public.accounts (apple_sub)`,
  `CREATE TABLE IF NOT EXISTS public.device_tokens (
     id UUID PRIMARY KEY,
     account_id UUID NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE ON UPDATE CASCADE,
     token TEXT NOT NULL UNIQUE,
     platform VARCHAR(10) NOT NULL,
     created_at TIMESTAMPTZ NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS device_tokens_account_id ON public.device_tokens (account_id)`,
];

const run = async () => {
  await sequelize.transaction(async (transaction) => {
    for (const sql of STATEMENTS) {
      await sequelize.query(sql, { transaction });
    }
  });
  console.log("Done — phone app columns and device_tokens are in place.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
