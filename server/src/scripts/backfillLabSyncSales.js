const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { Store } = require("../models/index.js");
const { shopifyGraphql } = require("../utils/shopifyGraphql.js");
const {
  RECENT_ORDERS_QUERY,
  toOrderPayload,
  hasLabSyncTag,
  attributeLabSyncLinks,
  applyRefunds,
} = require("../services/attribution.service.js");

// One-time: finds a store's past orders that came from LabSync "Buy now"
// links (tagged labsync_click_id) and records them as sales — they were
// missed before SyncStock recognised the tag (attribution.service.js).
// Previews by default; --apply saves. Safe to re-run (one row per order +
// item). Reads orders from Shopify; never changes anything in Shopify.
//
// Usage: node src/scripts/backfillLabSyncSales.js [--store=laboratory] [--since=2026-09-01] [--apply]
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] || fallback;
const APPLY = process.argv.includes("--apply");
const SUBDOMAIN = arg("store", "laboratory");
const SINCE = arg("since", "2026-09-01");

const run = async () => {
  const store = await Store.findOne({ where: { subdomain: SUBDOMAIN } });
  if (!store) throw new Error(`No store "${SUBDOMAIN}"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(SINCE)) throw new Error("--since must be YYYY-MM-DD");
  console.log(`${APPLY ? "Recording" : "Preview of"} LabSync-link sales for ${store.name}, orders since ${SINCE}\n`);

  let cursor = null;
  let orders = 0;
  let tagged = 0;
  let recorded = 0;
  const found = [];
  do {
    const data = await shopifyGraphql(store, RECENT_ORDERS_QUERY, { cursor, query: `created_at:>=${SINCE}` }, { allowPartial: true });
    const page = data?.orders;
    if (!page) break;
    for (const node of page.nodes) {
      orders += 1;
      const order = toOrderPayload(node);
      if (!hasLabSyncTag(order)) continue;
      tagged += 1;
      const plan = await attributeLabSyncLinks(store, order, { dryRun: true });
      for (const p of plan) found.push({ ...p, date: String(order.created_at).slice(0, 10) });
      if (APPLY && plan.length) {
        recorded += await attributeLabSyncLinks(store, order);
        await applyRefunds(store, order);
      }
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  for (const f of found) {
    const what = f.already_counted ? "already counted" : f.match === "exact" ? "sale" : "assisted (other size)";
    console.log(`  ${f.date}  order ${f.order}  ${f.product} (${f.size || "?"}) — ${what}`);
  }
  const fresh = found.filter((f) => !f.already_counted).length;
  console.log(`\n${orders} orders read · ${tagged} tagged by LabSync links · ${fresh} new sale(s) ${APPLY ? `· ${recorded} recorded` : "to record"}`);
  if (!APPLY && fresh) console.log("Run again with --apply to record them.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
