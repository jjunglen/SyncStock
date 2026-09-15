import { useState, useEffect } from "react";
import { LuShoppingBag } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import api from "../../lib/api.js";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/analytics/purchases?page=${page}`)
      .then((res) => {
        setPurchases(res.data.data || []);
        setMeta(res.data.meta);
      })
      .catch(() => setError("Failed to load purchases"))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar />

      <div className="flex-1 p-6 overflow-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LuShoppingBag size={18} className="text-text" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Purchases</h1>
        </div>
        <p className="text-text-muted text-sm mb-8">
          Every sale Syncstock has attributed, most recent first.
        </p>

        {loading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : purchases.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-border bg-surface">
            <p className="text-sm text-text-muted">No purchases yet.</p>
            <p className="text-xs text-text-muted mt-1">
              This fills in as real orders come through.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              {purchases.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-5 py-4 ${idx !== purchases.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium">{p.product_name}</p>
                    <p className="text-xs text-text-muted">
                      {p.size} · {p.customer_email} ·{" "}
                      {new Date(p.purchased_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.alert_id ? (
                      <span className="text-xs bg-live/10 text-live px-2 py-0.5 rounded-full">
                        From alert
                      </span>
                    ) : (
                      <span className="text-xs bg-white/5 text-text-muted px-2 py-0.5 rounded-full">
                        Matched
                      </span>
                    )}
                    <span className="text-sm font-semibold">
                      ${parseFloat(p.price_paid).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-sm text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-text-muted">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-sm text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
