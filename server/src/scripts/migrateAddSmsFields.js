const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration: adds the columns text alerts need. The code wrote
// these fields, but they never existed, so Sequelize silently dropped
// them — phone numbers and codes were never saved and no text could go
// out. Additive only; safe for older deployed code and safe to re-run.
//
// Run BEFORE starting a server with the updated models — they read
// these columns and will error until they exist.
//
// Usage: node src/scripts/migrateAddSmsFields.js
const STATEMENTS = [
  `ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`,
  `ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS phone_verification_code VARCHAR(6)`,
  `ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS phone_verification_expires TIMESTAMPTZ`,
  // Texts are opt-in by verifying a number; this lets shoppers turn
  // them off per store afterwards
  `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT false`,
  // The plan step already tried to turn SMS on for Pro stores
  `UPDATE public.stores SET sms_enabled = true WHERE plan = 'pro' AND sms_enabled = false`,
];

const run = async () => {
  await sequelize.transaction(async (transaction) => {
    for (const sql of STATEMENTS) {
      await sequelize.query(sql, { transaction });
    }
  });
  const [[{ pro }]] = await sequelize.query(
    `SELECT count(*)::int AS pro FROM public.stores WHERE sms_enabled`,
  );
  console.log(`Done — SMS columns added. Stores with texts enabled: ${pro}.`);
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
