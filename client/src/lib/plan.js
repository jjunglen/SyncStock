// The one Syncstock plan — shown on the landing page and /pricing
export const PLAN = {
  name: "Pro",
  price: 50,
  // Must match PLAN.trialDays in server/src/services/billing.service.js
  trialDays: 7,
  info: "Everything included, for any Shopify store",
  features: [
    "Automatic Shopify sync — including your existing catalog",
    "Unlimited customer restock alerts",
    "Email, push, and in-app notifications",
    "Text alerts coming soon, included at no extra cost",
    "Customer browse & search dashboard",
    "StockX-powered catalog search",
  ],
};
