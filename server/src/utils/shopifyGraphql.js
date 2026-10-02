const { getAccessToken } = require("./shopifyToken.js");

// Every call SyncStock makes to a store's Shopify admin goes through here
// — Shopify requires new public apps to use the GraphQL Admin API only
// (no REST). Handles the store's expiring token and Shopify's rate limit.
const API_VERSION = "2026-07";

const MAX_THROTTLE_RETRIES = 5;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// How long to wait when throttled: until enough of Shopify's query budget
// has refilled for this query, from the numbers Shopify sends back
const throttleWaitMs = (body) => {
  const cost = body.extensions?.cost;
  const status = cost?.throttleStatus;
  if (!status) return 2000;
  const needed = (cost.requestedQueryCost || 0) - status.currentlyAvailable;
  return Math.min(Math.max((needed / (status.restoreRate || 50)) * 1000, 500), 20000);
};

const isThrottled = (body) =>
  (body.errors || []).some?.((e) => e.extensions?.code === "THROTTLED");

// Runs a query and returns its data. Shopify can answer with data AND
// errors (e.g. a field the app isn't allowed to read comes back null);
// with allowPartial those errors are logged and the data is still used.
const shopifyGraphql = async (store, query, variables = {}, { allowPartial = false } = {}) => {
  const token = await getAccessToken(store);
  for (let attempt = 0; ; attempt++) {
    const resp = await fetch(`https://${store.shopify_domain}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    });
    const body = await resp.json().catch(() => ({}));

    if ((resp.status === 429 || isThrottled(body)) && attempt < MAX_THROTTLE_RETRIES) {
      await sleep(throttleWaitMs(body));
      continue;
    }
    if (!resp.ok) {
      throw new Error(`Shopify returned ${resp.status} for ${store.shopify_domain}: ${JSON.stringify(body.errors || body).slice(0, 300)}`);
    }
    if (body.errors?.length) {
      const message = JSON.stringify(body.errors).slice(0, 300);
      if (!allowPartial || !body.data) throw new Error(`Shopify GraphQL error for ${store.shopify_domain}: ${message}`);
      console.warn(`Shopify GraphQL partial data for ${store.shopify_domain}: ${message}`);
    }
    return body.data;
  }
};

const gid = (type, id) => `gid://shopify/${type}/${id}`;

module.exports = { API_VERSION, shopifyGraphql, gid };
