import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSubdomain } from "../lib/getSubdomain.js";
import { getStoreInfo } from "../lib/storeInfo.js";
import { USE_CASES } from "../lib/useCases.js";
import { applyPageMeta as apply, DEFAULT_DESCRIPTION } from "../lib/pageMeta.js";
import { getStoreCategories, categoryPath } from "../lib/storeLinks.js";
import { categoryLabel } from "../lib/categories.js";

// Search and link-preview info for each page: title, description,
// canonical address and whether search engines may index it. The
// marketing pages (www.syncstock.io) and each store's shopper home page
// are indexed; sign-ins, dashboards and unknown addresses are not.

const SITE = "https://www.syncstock.io";
const MARKETING = {
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

// App pages: a plain title, never indexed
const APP_TITLES = [
  [/^\/(dashboard|sourcing|purchases|customers|prices|buy-requests|settings|size-settings|account)/, "Dashboard — SyncStock"],
  [/^\/store\/(dashboard|track|profile|sell)/, null], // the store's own name, below
  [/^\/(login|signup|store\/login|store\/signup)/, "Sign in — SyncStock"],
  [/^\/onboarding/, "Set up — SyncStock"],
];
const KNOWN_APP = /^\/(dashboard|sourcing|purchases|customers|prices|price-check|buy-requests|settings|size-settings|account|platform|channel|onboarding|email-verification|reset-password|login|signup|store|dev)(\/|$)/;

// notFound: the page-not-found screen is showing
export default function Seo({ notFound = false }) {
  const { pathname, search } = useLocation();
  const subdomain = getSubdomain();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, "") || "/";

    // A store's shopper site: its home page and Browse are indexed under
    // the store's name; its sign-in and signed-in pages aren't. Product
    // pages (/p/…) set their own once the product loads.
    if (subdomain) {
      if (path.startsWith("/p/")) return;
      const site = `https://${subdomain}.syncstock.io`;
      const home = path === "/" || path === "/store";
      // Browse and each category's Browse page (?category= alone).
      // Searches, filters and later pages are reached by links, noindex
      // (every product is in the store's sitemap).
      const params = new URLSearchParams(search);
      const keys = [...params.keys()];
      const asked = keys.length === 1 && keys[0] === "category" ? params.get("category") : null;
      const browse = path === "/browse" && (!search || !!asked);
      const index = (home || browse) && !notFound;
      const canonicalFor = (categories) =>
        home ? `${site}/` : browse ? `${site}${categoryPath(asked, categories)}` : null;
      apply({
        title: "SyncStock",
        description: DEFAULT_DESCRIPTION,
        canonical: canonicalFor(null),
        index,
      });
      Promise.all([getStoreInfo(), browse ? getStoreCategories().catch(() => []) : null])
        .then(([info, categories]) => {
          if (!info?.name) return;
          const category = asked && categories?.find((c) => c.key === asked);
          // An unknown category shows the first one: same page as /browse
          const shown = category && category !== categories[0] ? category : null;
          const label = shown && categoryLabel(shown.key, shown.name);
          apply({
            title: home
              ? `${info.name} — In-stock alerts`
              : label
                ? `${label} at ${info.name} — In stock now`
                : path === "/browse"
                  ? `Shop ${info.name} — In stock now`
                  : info.name,
            description: home
              ? `Get notified the moment your size is back in stock at ${info.name}. Save your sizes and track the items you want.`
              : label
                ? `${label} in stock at ${info.name} right now, by size and price. Save your sizes and get an alert the moment what you want is back.`
                : path === "/browse"
                  ? `Everything in stock at ${info.name} right now, by size and price. Save your sizes and get an alert the moment what you want is back.`
                  : DEFAULT_DESCRIPTION,
            canonical: browse ? `${site}${categoryPath(shown?.key, categories)}` : canonicalFor(null),
            index,
          });
        })
        .catch(() => {});
      return;
    }

    const page = !notFound && MARKETING[path];
    if (page) {
      apply({ ...page, canonical: `${SITE}${path === "/" ? "/" : path}`, index: true });
      return;
    }
    const appTitle = APP_TITLES.find(([re]) => re.test(path))?.[1];
    apply({
      title: notFound || !KNOWN_APP.test(path) ? "Page not found — SyncStock" : appTitle || "SyncStock",
      description: DEFAULT_DESCRIPTION,
      canonical: null,
      index: false,
    });
  }, [pathname, search, subdomain, notFound]);

  return null;
}
