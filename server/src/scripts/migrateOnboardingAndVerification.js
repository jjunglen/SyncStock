const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for saved merchant onboarding + email verification:
//   1. stores.onboarding_step — live stores are "complete"; unfinished
//      ones resume at "account" (no owner yet) or "subdomain".
//   2. Marks every EXISTING account verified, so nobody who signed up
//      before verification existed gets locked out at login.
// Additive and safe to re-run. Run BEFORE starting a server with the
// updated Store model — it reads onboarding_step.
//
// Usage: node src/scripts/migrateOnboardingAndVerification.js
const run = async () => {
  await sequelize.transaction(async (transaction) => {
    const q = (sql) => sequelize.query(sql, { transaction });
    await q(`ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(20) NOT NULL DEFAULT 'account'`);
    await q(`UPDATE public.stores SET onboarding_step = 'complete' WHERE status = 'active' AND onboarding_step <> 'complete'`);
    await q(`UPDATE public.stores s SET onboarding_step = 'subdomain'
             WHERE s.status = 'pending' AND s.onboarding_step = 'account'
               AND EXISTS (SELECT 1 FROM public.users u WHERE u.store_id = s.id AND u.role = 'admin')`);
    await q(`UPDATE public.accounts SET email_verified = true WHERE email_verified IS NOT true`);
  });

  const [[counts]] = await sequelize.query(`SELECT
    (SELECT count(*) FROM public.stores WHERE onboarding_step = 'complete')::int AS complete,
    (SELECT count(*) FROM public.stores WHERE onboarding_step <> 'complete')::int AS unfinished,
    (SELECT count(*) FROM public.accounts WHERE email_verified)::int AS verified`);
  console.log(
    `Done — stores complete: ${counts.complete}, unfinished: ${counts.unfinished}; accounts marked verified: ${counts.verified}.`,
  );
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
