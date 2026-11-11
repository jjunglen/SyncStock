import { Link } from "react-router-dom";
import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import Footer from "../components/marketing/Footer.jsx";
import StoreHeader from "../components/store/StoreHeader.jsx";
import StoreFooter from "../components/store/StoreFooter.jsx";
import Button from "../components/ui/Button.jsx";
import { getSubdomain } from "../lib/getSubdomain.js";
import { USE_CASES } from "../lib/useCases.js";
import { storeHomePath } from "../lib/storeLinks.js";

// Any address the site doesn't have. Not indexed (components/Seo.jsx).
// Never a dead end: the site's own header and footer, and links to the
// pages people most likely wanted.
export default function NotFound() {
  const store = !!getSubdomain() || (import.meta.env.DEV && !!import.meta.env.VITE_DEV_STORE && window.location.pathname.startsWith("/p/"));

  const suggestions = store
    ? [
        { to: "/browse", label: "Everything in stock" },
        { to: storeHomePath(), label: "Store home" },
        { to: "/store/signup", label: "Get restock alerts" },
      ]
    : [
        { to: "/", label: "Syncstock home" },
        { to: "/pricing", label: "Pricing" },
        { to: "/stores", label: "Stores on Syncstock" },
        ...USE_CASES.map((p) => ({ to: p.path, label: p.navLabel })),
      ];

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {store ? <StoreHeader /> : <MarketingHeader />}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-40 pb-20 text-center">
        <p className="text-sm text-text-muted">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-text-muted">
          That page doesn't exist or has moved{store ? " (the item may have sold)" : ""}.
        </p>
        <Button to={store ? "/browse" : "/"} variant="primary" className="mt-6">
          {store ? "Shop what's in stock" : "Go to the home page"}
        </Button>
        <nav aria-label="Popular pages" className="mt-10 w-full">
          <h2 className="text-xs uppercase tracking-wide text-text-muted mb-3">Popular pages</h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <li key={s.to + s.label}>
                <Link
                  to={s.to}
                  className="inline-block rounded-full border border-border px-3 py-1.5 text-sm text-text-muted hover:text-text hover:border-text/30 transition-colors"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      {store ? <StoreFooter /> : <Footer />}
    </div>
  );
}
