import { USE_CASES } from "./useCases.js";
import { DEFAULT_DESCRIPTION } from "./pageMeta.js";

// Title and description of each public www page — set as the page opens
// (components/Seo.jsx) and written into the pre-built HTML
// (scripts/prerender.mjs)
export const MARKETING = {
  "/": {
    title: "SyncStock — Restock alerts for sneaker, streetwear and card stores",
    description: DEFAULT_DESCRIPTION,
  },
  "/pricing": {
    title: "Pricing — SyncStock",
    description: "One plan for any Shopify store: automatic catalog sync, unlimited restock alerts and a shopper browse dashboard. 7-day free trial.",
  },
  "/privacy": { title: "Privacy Policy — SyncStock", description: "How SyncStock collects, uses and protects store and shopper data." },
  "/terms": { title: "Terms of Service — SyncStock", description: "The terms for using SyncStock as a store or a shopper." },
  "/cookies": { title: "Cookie Policy — SyncStock", description: "The cookies SyncStock uses and why." },
  "/stores": {
    title: "Joined Stores — Shop Restock Alerts on SyncStock",
    description: "Sneaker, streetwear and trading card stores on SyncStock. Pick a store, save your sizes, and get an alert the moment what you want is back.",
  },
  ...Object.fromEntries(USE_CASES.map((p) => [p.path, { title: p.title, description: p.description }])),
};
