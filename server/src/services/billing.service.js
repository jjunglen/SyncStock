const { User, Account } = require("../models/index.js");

// Merchant billing through Shopify: the $40/month plan is charged on the
// merchant's Shopify invoice. SyncStock asks Shopify for a subscription,
// the merchant approves it in Shopify, and the store only goes live once
// Shopify confirms it's ACTIVE. Changes after that (cancelled, payment
// problems) arrive on the app_subscriptions/update webhook.
const PLAN = {
  name: "Syncstock Pro",
  price: 40,
  // Only the first subscription gets a trial — reinstalling doesn't
  // restart it
  trialDays: 7,
};

// Stores owned by these accounts never pay — the flagship store (The
// Laboratory DTX), which is also the test account. Comma-separated.
const exemptEmails = () =>
  (process.env.BILLING_EXEMPT_EMAILS || "thelabdtx@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const isBillingExempt = async (store) => {
  const admins = await User.findAll({
    where: { store_id: store.id, role: "admin" },
    include: [{ model: Account, attributes: ["email"] }],
  });
  const exempt = exemptEmails();
  return admins.some((a) => exempt.includes((a.Account?.email || "").toLowerCase()));
};


const shopifyGraphql = async (store, query, variables) => {
  const resp = await fetch(`https://${store.shopify_domain}/admin/api/2025-01/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": store.shopify_access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await resp.json();
  if (!resp.ok || body.errors) {
    throw new Error(`Shopify billing request failed: ${JSON.stringify(body.errors || resp.status)}`);
  }
  return body.data;
};

// Shopify development stores (for testing) can't be charged for real, so
// they get test charges — approved the same way, but never billed. Real
// stores are always charged for real. SHOPIFY_BILLING_TEST=true forces
// test charges everywhere.
const useTestCharges = async (store) => {
  if (process.env.SHOPIFY_BILLING_TEST === "true") return true;
  const data = await shopifyGraphql(store, `{ shop { plan { partnerDevelopment } } }`);
  return !!data.shop?.plan?.partnerDevelopment;
};

// Starts a subscription; returns the Shopify page where the merchant
// approves it
const createSubscription = async (store) => {
  const test = await useTestCharges(store);
  const data = await shopifyGraphql(
    store,
    `mutation ($name: String!, $returnUrl: URL!, $trialDays: Int, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(name: $name, returnUrl: $returnUrl, trialDays: $trialDays, test: $test, lineItems: $lineItems) {
        userErrors { field message }
        confirmationUrl
        appSubscription { id status }
      }
    }`,
    {
      name: PLAN.name,
      returnUrl: `${process.env.BACKEND_URL}/api/store/billing/callback?store=${store.id}`,
      trialDays: store.billing_started_at ? 0 : PLAN.trialDays,
      test,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: PLAN.price, currencyCode: "USD" },
              interval: "EVERY_30_DAYS",
            },
          },
        },
      ],
    },
  );
  const result = data.appSubscriptionCreate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map((e) => e.message).join("; "));
  }
  return { confirmationUrl: result.confirmationUrl, subscriptionId: result.appSubscription.id };
};

// The subscription's status straight from Shopify (ACTIVE, PENDING,
// DECLINED, CANCELLED, EXPIRED, FROZEN) — never trusted from the browser
const subscriptionStatus = async (store, subscriptionId) => {
  const data = await shopifyGraphql(
    store,
    `query ($id: ID!) { node(id: $id) { ... on AppSubscription { id status } } }`,
    { id: subscriptionId },
  );
  return data.node?.status || null;
};

module.exports = {
  PLAN,
  isBillingExempt,
  createSubscription,
  subscriptionStatus,
};
