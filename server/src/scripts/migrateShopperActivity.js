const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { sequelize } = require("../config/database.js");

// One-time migration for the platform admin's shopper activity:
//   search_logs  — what shoppers search (searchLog.service.js)
//   site_visits  — one row per person per store per day, with their
//                  device, for mobile vs desktop (visit.service.js)
//   alert_emails — each alert email sent, and whether it was clicked
//                  (digest.service.js, emailLinkLogin)
//   stores.former_subdomains — old subdomains that forward to the
//                  current one (platform admin's "Change subdomain")
// Additive only. Run it BEFORE deploying the code that writes them. Safe
// to run more than once.
//
// Usage: node src/scripts/migrateShopperActivity.js
const run = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.search_logs (
      id UUID PRIMARY KEY,
      store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
      visitor VARCHAR(64) NOT NULL,
      query VARCHAR(80) NOT NULL,
      results INTEGER NOT NULL DEFAULT 0,
      match VARCHAR(10),
      source VARCHAR(12) NOT NULL DEFAULT 'browse',
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS search_logs_created_at ON public.search_logs (created_at)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS search_logs_store_id_created_at ON public.search_logs (store_id, created_at)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS search_logs_visitor_updated_at ON public.search_logs (visitor, updated_at)`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.site_visits (
      id UUID PRIMARY KEY,
      store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
      visitor VARCHAR(64) NOT NULL,
      day DATE NOT NULL,
      device VARCHAR(10) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )`);
  await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS site_visits_store_id_visitor_day ON public.site_visits (store_id, visitor, day)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS site_visits_day ON public.site_visits (day)`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.alert_emails (
      id UUID PRIMARY KEY,
      store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
      account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
      items INTEGER NOT NULL DEFAULT 1,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      first_clicked_at TIMESTAMPTZ,
      clicks INTEGER NOT NULL DEFAULT 0
    )`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS alert_emails_sent_at ON public.alert_emails (sent_at)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS alert_emails_store_id_sent_at ON public.alert_emails (store_id, sent_at)`);

  await sequelize.query(
    `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS former_subdomains VARCHAR(63)[] NOT NULL DEFAULT '{}'`,
  );

  // Only the API reads them: row-level security with no policies keeps
  // Supabase's public data API out
  await sequelize.query(`ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY`);
  await sequelize.query(`ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY`);
  await sequelize.query(`ALTER TABLE public.alert_emails ENABLE ROW LEVEL SECURITY`);
  console.log("search_logs, site_visits, alert_emails and stores.former_subdomains ready");
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
