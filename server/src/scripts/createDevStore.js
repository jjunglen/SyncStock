require("dotenv").config();
const { Store } = require("../models/index.js");

const run = async () => {
  const existing = await Store.findOne({ where: { subdomain: "devstore" } });
  if (existing) {
    console.log("Dev store already exists:", existing.id);
    process.exit(0);
  }

  const store = await Store.create({
    name: "Dev Store",
    shopify_domain: "dev-store.myshopify.com",
    storefront_url: "https://dev-store.myshopify.com",
    shopify_access_token: "fake-token-for-local-testing",
    shopify_webhook_secret: "fake-secret-for-local-testing",
    subdomain: "devstore",
    status: "pending", // so the next login grants admin automatically
    plan: "pro",
  });

  console.log("Dev store created:", store.id);
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed to create dev store:", err.message);
  process.exit(1);
});
