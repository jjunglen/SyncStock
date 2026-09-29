const path = require("path");
// Load server/.env regardless of the directory this is run from
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { Store } = require("../models/index.js");

// One-time: adds the app/uninstalled webhook to stores that connected
// before it was part of registerShopifyWebhooks (store.controller.js).
// New connects get it automatically. Always points at the live API, not
// BACKEND_URL — locally that's an ngrok tunnel.
// Without --apply it only reports what it would do.
//
// Usage: node src/scripts/registerUninstallWebhook.js [--apply]
const API = "https://api.syncstock.io";
const TOPIC = "app/uninstalled";
const address = `${API}/api/webhooks/shopify/${TOPIC}`;
const apply = process.argv.includes("--apply");

const run = async () => {
  const stores = await Store.findAll({ where: { status: "active" } });
  for (const store of stores) {
    const base = `https://${store.shopify_domain}/admin/api/2025-01/webhooks.json`;
    const headers = { "X-Shopify-Access-Token": store.shopify_access_token };

    const list = await fetch(`${base}?topic=${encodeURIComponent(TOPIC)}`, { headers });
    if (!list.ok) {
      console.log(`${store.subdomain}: skipped — Shopify returned ${list.status}`);
      continue;
    }
    const { webhooks } = await list.json();
    if ((webhooks || []).some((w) => w.address === address)) {
      console.log(`${store.subdomain}: already registered`);
      continue;
    }
    if (!apply) {
      console.log(`${store.subdomain}: would register ${TOPIC} → ${address}`);
      continue;
    }

    const created = await fetch(base, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ webhook: { topic: TOPIC, address, format: "json" } }),
    });
    const body = await created.json();
    console.log(
      created.ok
        ? `${store.subdomain}: registered (webhook ${body.webhook?.id})`
        : `${store.subdomain}: failed — ${created.status} ${JSON.stringify(body.errors || body)}`,
    );
  }
  if (!apply) console.log("\nDry run — re-run with --apply to register.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
