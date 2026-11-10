import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSubdomain } from "../lib/getSubdomain.js";
import { getStoreInfo } from "../lib/storeInfo.js";

// Search and link-preview info for each page: title, description,
// canonical address and whether search engines may index it. The
// marketing pages (www.syncstock.io) and each store's shopper home page
// are indexed; sign-ins, dashboards and unknown addresses are not.

const SITE = "https://www.syncstock.io";
const DEFAULT_DESCRIPTION =
  "Restock alerts for sneaker, streetwear and trading card stores on Shopify. Shoppers get notified the moment their size is back, and you see exactly what to restock next.";

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
};

// App pages: a plain title, never indexed
const APP_TITLES = [
  [/^\/(dashboard|sourcing|purchases|customers|prices|buy-requests|settings|size-settings|account)/, "Dashboard — SyncStock"],
  [/^\/store\/(dashboard|track|profile|sell)/, null], // the store's own name, below
  [/^\/(login|signup|store\/login|store\/signup)/, "Sign in — SyncStock"],
  [/^\/onboarding/, "Set up — SyncStock"],
];
const KNOWN_APP = /^\/(dashboard|sourcing|purchases|customers|prices|price-check|buy-requests|settings|size-settings|account|platform|channel|onboarding|email-verification|reset-password|login|signup|store|dev)(\/|$)/;

const setMeta = (attr, key, content) => {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const setCanonical = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
};

const apply = ({ title, description, canonical, index }) => {
  document.title = title;
  setMeta("name", "description", description);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  if (canonical) setMeta("property", "og:url", canonical);
  setMeta("name", "robots", index ? "index, follow" : "noindex, follow");
  setCanonical(canonical);
};

// notFound: the page-not-found screen is showing
export default function Seo({ notFound = false }) {
  const { pathname } = useLocation();
  const subdomain = getSubdomain();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, "") || "/";

    // A store's shopper site: its home page is indexed under the store's
    // name; its sign-in and signed-in pages aren't
    if (subdomain) {
      const home = path === "/" || path === "/store";
      apply({
        title: "SyncStock",
        description: DEFAULT_DESCRIPTION,
        canonical: home ? `https://${subdomain}.syncstock.io/` : null,
        index: home && !notFound,
      });
      getStoreInfo()
        .then((info) => {
          if (!info?.name) return;
          apply({
            title: home ? `${info.name} — In-stock alerts` : info.name,
            description: home
              ? `Get notified the moment your size is back in stock at ${info.name}. Save your sizes and track the items you want.`
              : DEFAULT_DESCRIPTION,
            canonical: home ? `https://${subdomain}.syncstock.io/` : null,
            index: home && !notFound,
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
  }, [pathname, subdomain, notFound]);

  return null;
}
