import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSubdomain } from "../lib/getSubdomain.js";
import { getStoreInfo } from "../lib/storeInfo.js";
import { USE_CASES } from "../lib/useCases.js";
import { applyPageMeta as apply, DEFAULT_DESCRIPTION } from "../lib/pageMeta.js";

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
      const home = path === "/" || path === "/store";
      // Only the plain /browse: filtered and later pages are reached by
      // links (and every product is in the store's sitemap)
      const browse = path === "/browse" && !search;
      const canonical = home
        ? `https://${subdomain}.syncstock.io/`
        : browse
          ? `https://${subdomain}.syncstock.io/browse`
          : null;
      const index = (home || browse) && !notFound;
      apply({
        title: "SyncStock",
        description: DEFAULT_DESCRIPTION,
        canonical,
        index,
      });
      getStoreInfo()
        .then((info) => {
          if (!info?.name) return;
          apply({
            title: home
              ? `${info.name} — In-stock alerts`
              : path === "/browse"
                ? `Shop ${info.name} — In stock now`
                : info.name,
            description: home
              ? `Get notified the moment your size is back in stock at ${info.name}. Save your sizes and track the items you want.`
              : path === "/browse"
                ? `Everything in stock at ${info.name} right now, by size and price. Save your sizes and get an alert the moment what you want is back.`
                : DEFAULT_DESCRIPTION,
            canonical,
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
