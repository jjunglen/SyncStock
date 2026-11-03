import { useState, useEffect } from "react";
import { LuShoppingBag } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import api from "../../lib/api.js";
import { purchaseBadges, BADGE_CLASSES, netAmount, isRefunded } from "../../lib/purchaseLabels.js";

// "2026-10" → "October 2026"
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Purchases (already newest first) split into runs of the same month
const groupByMonth = (rows) => {
  const groups = [];
  for (const row of rows) {
    const month = row.month || String(row.purchased_at).slice(0, 7);
    if (groups.at(-1)?.month !== month) groups.push({ month, rows: [] });
    groups.at(-1).rows.push(row);
  }
  return groups;
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [months, setMonths] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  // The last month shown on the previous page, to mark a month that carries on
  const [prevMonth, setPrevMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/analytics/purchases?page=${page}`)
      .then((res) => {
        setPurchases(res.data.data || []);
        setMonths(res.data.months || []);
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
          Items bought after a shopper clicked a Syncstock alert, by month, most recent first.
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
            <div className="space-y-6">
              {groupByMonth(purchases).map(({ month, rows }, gi) => {
                const totals = months.find((m) => m.month === month);
                // The month started on the page before
                const continued = gi === 0 && page > 1 && prevMonth === month;
                return (
                  <section key={month} aria-label={monthLabel(month)}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2 px-1">
                      <h2 className="text-sm font-semibold">
                        {monthLabel(month)}
                        {continued && <span className="ml-1.5 text-xs font-normal text-text-muted">continued</span>}
                      </h2>
                      {totals && (
                        <p className="text-xs text-text-muted">
                          {totals.sales} sale{totals.sales === 1 ? "" : "s"} ·{" "}
                          <span className="font-semibold text-text">{money(totals.revenue)}</span> revenue
                          {totals.assisted > 0 && ` · ${totals.assisted} assisted`}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border border-border bg-surface overflow-hidden">
                      {rows.map((p, idx) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between gap-3 px-5 py-4 ${idx !== rows.length - 1 ? "border-b border-border" : ""}`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{p.product_name}</p>
                            <p className="text-xs text-text-muted">
                              {[p.size, p.customer_email, new Date(p.purchased_at).toLocaleDateString()]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {purchaseBadges(p).map((b) => (
                              <span key={b.label} className={`text-xs px-2 py-0.5 rounded-full ${BADGE_CLASSES[b.tone]}`}>
                                {b.label}
                              </span>
                            ))}
                            <span className="text-sm font-semibold">
                              {isRefunded(p) && (
                                <span className="mr-1.5 text-xs font-normal text-text-muted line-through">
                                  ${parseFloat(p.price_paid).toFixed(2)}
                                </span>
                              )}
                              ${netAmount(p).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    setPrevMonth(null);
                    setPage((p) => p - 1);
                  }}
                  className="text-sm text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-text-muted">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => {
                    setPrevMonth(purchases[purchases.length - 1]?.month || null);
                    setPage((p) => p + 1);
                  }}
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
