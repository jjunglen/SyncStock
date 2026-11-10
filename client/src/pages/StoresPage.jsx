import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuArrowUpRight, LuStore } from "react-icons/lu";
import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import Footer from "../components/marketing/Footer.jsx";
import Button from "../components/ui/Button.jsx";
import api from "../lib/api.js";
import { categoryLabel } from "../lib/categories.js";

// "Joined stores" (syncstock.io/stores): stores on SyncStock that chose to
// be listed (Store settings → Joined stores). Each card opens the store's
// shopper site, so new shoppers can find stores and save their sizes.
export default function StoresPage() {
  const [stores, setStores] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .get("/directory")
      .then((res) => setStores(res.data.data || []))
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="relative min-h-screen bg-bg text-text">
      <MarketingHeader />
      <main className="px-4 pt-32 pb-24 sm:pt-40">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Joined stores</p>
            <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl text-balance">Stores on SyncStock</h1>
            <p className="mt-4 text-base sm:text-lg text-text-muted text-balance">
              Pick a store, save your sizes, and get an alert the moment what you want is back in stock.
            </p>
          </div>

          {failed && <p className="mt-12 text-center text-sm text-text-muted">Stores couldn't load. Refresh to try again.</p>}

          {stores && stores.length > 0 && (
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((s) => (
                <li key={s.subdomain}>
                  <a
                    href={s.url}
                    className="group flex h-full items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-text/30"
                  >
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white"
                      style={!s.logo_url && s.brand_color ? { background: s.brand_color } : undefined}
                    >
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <LuStore size={22} className="text-neutral-500" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-semibold">
                        <span className="truncate">{s.name}</span>
                        <LuArrowUpRight size={16} className="shrink-0 text-text-muted group-hover:text-text" aria-hidden="true" />
                      </span>
                      <span className="mt-1 block text-xs text-text-muted">
                        {s.categories.map((c) => categoryLabel(c, s.other_name)).join(" · ")}
                      </span>
                      <span className="mt-1 block truncate text-xs text-text-muted">{s.subdomain}.syncstock.io</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {stores && stores.length === 0 && (
            <p className="mt-12 text-center text-sm text-text-muted">Stores will show up here as they join.</p>
          )}

          <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center">
            <h2 className="text-xl font-semibold">Run a store on Shopify?</h2>
            <p className="mt-2 text-sm text-text-muted">Give your shoppers restock alerts in their size, and list your store here.</p>
            <Link to="/onboarding" className="mt-5 inline-block">
              <Button variant="primary">Connect your Shopify store</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
