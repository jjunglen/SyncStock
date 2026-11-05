import { useSearchParams } from "react-router-dom";
import { LuHandCoins } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import BetaBadge from "../../components/ui/BetaBadge.jsx";
import PriceGuide from "../../components/dashboard/PriceGuide.jsx";
import BuyRequestsList from "../../components/dashboard/BuyRequestsList.jsx";

// /buy-requests — "Sell your items" (beta) for the merchant: pairs
// shoppers sent to sell, and the price guide built from the store's own
// sales history
const TABS = [
  { key: "requests", label: "Requests" },
  { key: "guide", label: "Price guide" },
];

export default function BuyRequestsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "requests";

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar />
      <div className="flex-1 p-4 sm:p-6 overflow-auto min-w-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LuHandCoins size={18} className="text-text" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              Buy requests
              <BetaBadge />
            </h1>
            <p className="text-text-muted text-sm">Pairs shoppers want to sell you, priced from your own sales.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-5" role="tablist" aria-label="Buy requests">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setParams({ tab: t.key }, { replace: true })}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                tab === t.key ? "bg-primary text-primary-text border-primary" : "border-border text-text hover:bg-text/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "guide" ? (
          <div className="max-w-4xl">
            <PriceGuide endpoint="/sell/store/guide" />
          </div>
        ) : (
          <BuyRequestsList />
        )}
      </div>
    </div>
  );
}
