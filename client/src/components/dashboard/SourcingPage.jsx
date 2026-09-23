import { useState, useEffect } from "react";
import { LuTrendingUp } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import api from "../../lib/api.js";

export default function SourcingPage() {
  const [sourcing, setSourcing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/analytics/sourcing-demand")
      .then((res) => setSourcing(res.data.data || []))
      .catch(() => setError("Failed to load sourcing demand"))
      .finally(() => setLoading(false));
  }, []);

  const notInStockCount = sourcing.filter((i) => !i.currently_in_stock).length;

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar />

      <div className="flex-1 p-6 overflow-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LuTrendingUp size={18} className="text-text" />
          </div>
          <h1 className="font-display text-2xl font-semibold">
            What to source next
          </h1>
        </div>
        <p className="text-text-muted text-sm mb-8">
          Ranked by how many active customers have a waiting alert for it.
          {!loading &&
            ` ${notInStockCount} of these aren't currently in stock.`}
        </p>

        {loading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : sourcing.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-border bg-surface">
            <p className="text-sm text-text-muted">No active alerts yet.</p>
            <p className="text-xs text-text-muted mt-1">
              This fills in as customers start tracking shoes.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            {sourcing.map((item, idx) => (
              <div
                key={`${item.product_key}-${item.size}`}
                className={`flex items-center justify-between px-5 py-4 ${idx !== sourcing.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-text-muted text-sm w-5">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-text-muted">{item.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!item.currently_in_stock && (
                    <span className="text-xs bg-warn/10 text-warn px-2 py-0.5 rounded-full">
                      Not in stock
                    </span>
                  )}
                  <span className="text-sm font-semibold">
                    {item.demand_count} waiting
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
