import { useEffect, useState } from "react";
import { LuArrowUpRight, LuStore } from "react-icons/lu";
import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import Footer from "../components/marketing/Footer.jsx";
import Button from "../components/ui/Button.jsx";
import api from "../lib/api.js";
import { categoryLabel } from "../lib/categories.js";

// "Joined stores" (syncstock.io/stores): stores on SyncStock that chose to
// be listed (Store settings → Joined stores). Each card opens the store's
// shopper site, so new shoppers can find stores and save their sizes.
// How it works for shoppers — the same at every store
const SHOPPER_STEPS = [
  { title: "Pick a store", text: "Open a store below and browse what's in stock right now, by size, brand and price." },
  { title: "Save your sizes", text: "Sign up free and save your shoe and clothing sizes, then pick the items you want." },
  { title: "Get the alert", text: "The moment one is back in your size, you get an email, a push notification or an in-app alert, with a link straight to it." },
];

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

          <section className="mt-16">
            <h2 className="text-center text-2xl font-semibold">How restock alerts work</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {SHOPPER_STEPS.map(({ title, text }, i) => (
                <li key={title} className="rounded-xl border border-border bg-surface p-5">
                  <p className="text-xs font-medium text-text-muted">Step {i + 1}</p>
                  <h3 className="mt-1 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-text-muted">{text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-center text-sm text-text-muted">
              Free for shoppers. Each store has its own page, so your sizes and alerts stay with the stores you choose.
            </p>
          </section>

          <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center">
            <h2 className="text-xl font-semibold">Run a store on Shopify?</h2>
            <p className="mt-2 text-sm text-text-muted">Give your shoppers restock alerts in their size, and list your store here.</p>
            <Button to="/onboarding" variant="primary" className="mt-5">Connect your Shopify store</Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
