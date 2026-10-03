import { Link } from "react-router-dom";
import { LuStore, LuExternalLink } from "react-icons/lu";
import Button from "../../components/ui/Button.jsx";
import BlackHoleBackground from "../../components/ui/BlackHoleBackground.jsx";

// Step 1 of merchant setup. SyncStock is installed from the Shopify App
// Store — Shopify's rules don't allow asking merchants to type their
// store's address. After they approve it in Shopify, the install comes
// back to /onboarding/setup (store.controller.js handleShopifyCallback).
// Merchants are also sent here when an install didn't finish (?error=…).
const APP_STORE_URL =
  import.meta.env.VITE_SHOPIFY_APP_STORE_URL || "https://apps.shopify.com/search?q=syncstock";

const ERRORS = {
  beta: "Syncstock is in private beta. Email hello@syncstock.io to get your store on the list.",
  connect_failed: "Connecting your store didn't finish. Install SyncStock from Shopify again to retry.",
};

export default function ConnectShopify() {
  const error = ERRORS[new URLSearchParams(window.location.search).get("error")] || "";

  return (
    <div className="min-h-screen bg-bg text-text relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <BlackHoleBackground />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-text-muted text-xs">
            <span>Getting started</span>
            <span>Step 1 of 4</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: "25%" }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <LuStore size={26} className="text-text" />
          </div>
          <div>
            <p className="font-semibold">Install SyncStock from Shopify</p>
            <p className="mt-1 text-text-muted text-sm">
              Add SyncStock to your store from the Shopify App Store. Once you
              approve it in Shopify, you'll come right back here to finish setup.
            </p>
          </div>
        </div>

        {error && <p className="text-danger text-xs">{error}</p>}

        <Button variant="primary" fullWidth onClick={() => window.location.assign(APP_STORE_URL)}>
          <span className="flex items-center justify-center gap-2">
            Find SyncStock on the App Store <LuExternalLink size={16} />
          </span>
        </Button>

        <p className="text-center text-xs text-text-muted">
          Already set up?{" "}
          <Link to="/login" className="text-text underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
