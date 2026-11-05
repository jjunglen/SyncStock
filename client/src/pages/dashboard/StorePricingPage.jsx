import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuScale } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import BetaBadge from "../../components/ui/BetaBadge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import ListingsVsSales from "../../components/dashboard/ListingsVsSales.jsx";
import { PriceCheckPanel } from "./PriceCheckPage.jsx";
import api from "../../lib/api.js";
import useLiveRefresh from "../../lib/useLiveRefresh.js";

// /prices — the dashboard's Pricing page (beta; /pricing is the plans page) — are the store's prices right?
//   "Your listings": against the store's own past sales (any store with
//     sales history — sneakers, clothing, snowboards…)
//   "vs StockX": the StockX price check, only for stores that have it
//     (flagship for now; the server says which in `stockx`)
// ?tab=stockx opens the StockX tab (the old /price-check link).
export default function StorePricingPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Refreshes while open, so a price changed in Shopify shows here
  useLiveRefresh(() => {
    api
      .get("/analytics/listing-prices")
      .then((res) => {
        setData(res.data.data);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load your listings"));
  }, 60 * 1000);

  const stockx = !!data?.stockx;
  const tab = params.get("tab") === "stockx" && stockx ? "stockx" : "listings";
  const tabs = [
    { key: "listings", label: "Your listings" },
    ...(stockx ? [{ key: "stockx", label: "vs StockX" }] : []),
  ];

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar />
      <div className="flex-1 p-6 overflow-auto min-w-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LuScale size={18} className="text-text" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              Pricing <BetaBadge />
            </h1>
            <p className="text-text-muted text-sm">Are your prices right? Spot listings priced too high or too low.</p>
          </div>
        </div>

        {tabs.length > 1 && (
          <div className="mb-6 flex gap-1 border-b border-border" role="tablist" aria-label="Pricing">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setParams(t.key === "listings" ? {} : { tab: t.key }, { replace: true })}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.key ? "border-primary text-text" : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {tab === "stockx" ? (
          <PriceCheckPanel />
        ) : error ? (
          <p className="text-danger text-sm">{error}</p>
        ) : !data ? (
          <Spinner size={20} />
        ) : (
          <ListingsVsSales data={data} />
        )}
      </div>
    </div>
  );
}
