import { useState } from "react";
import { LuTrendingUp, LuSearch, LuSlidersHorizontal, LuX } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import api from "../../lib/api.js";
import useLiveRefresh from "../../lib/useLiveRefresh.js";

export default function SourcingPage() {
  const [sourcing, setSourcing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Search and filters (all on this page, nothing refetched)
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [stock, setStock] = useState("all"); // all | out | in
  const [sizeFilter, setSizeFilter] = useState("");
  const [sort, setSort] = useState("wanted"); // wanted | name

  // Refreshes while open, so a restock in Shopify shows here
  useLiveRefresh(() => {
    api
      .get("/analytics/sourcing-demand")
      .then((res) => {
        setSourcing(res.data.data || []);
        setError("");
      })
      .catch(() => setError("Failed to load sourcing demand"))
      .finally(() => setLoading(false));
  });

  const notInStockCount = sourcing.filter((i) => !i.currently_in_stock).length;

  // Each item keeps its rank in the full list, whatever is filtered
  const ranked = sourcing.map((item, idx) => ({ ...item, rank: idx + 1 }));
  const sizeOptions = [...new Set(sourcing.map((i) => i.size || "One size"))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = ranked
    .filter((i) => {
      const text = `${i.product_name} ${i.size || "one size"}`.toLowerCase();
      if (!words.every((w) => text.includes(w))) return false;
      if (stock === "in" && !i.currently_in_stock) return false;
      if (stock === "out" && i.currently_in_stock) return false;
      if (sizeFilter && (i.size || "One size") !== sizeFilter) return false;
      return true;
    })
    .sort((a, b) =>
      sort === "name" ? a.product_name.localeCompare(b.product_name) || a.rank - b.rank : a.rank - b.rank,
    );
  const filterCount = (stock !== "all") + !!sizeFilter + (sort !== "wanted");
  const clearFilters = () => {
    setStock("all");
    setSizeFilter("");
    setSort("wanted");
  };
  const chip = (active) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active ? "border-primary bg-primary text-primary-text" : "border-border text-text-muted hover:text-text"
    }`;

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
          <>
            <div className="mb-4 flex gap-2">
              <label className="relative flex-1">
                <LuSearch
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or size"
                  aria-label="Search tracked items"
                  className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm placeholder:text-text-muted focus:border-text/30 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setShowFilters((o) => !o)}
                aria-expanded={showFilters}
                className={`flex items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors ${
                  showFilters || filterCount ? "border-text/30 text-text" : "border-border text-text-muted hover:text-text"
                }`}
              >
                <LuSlidersHorizontal size={16} aria-hidden="true" />
                Filter{filterCount > 0 && ` (${filterCount})`}
              </button>
            </div>

            {showFilters && (
              <div className="mb-4 space-y-4 rounded-xl border border-border bg-surface p-4">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Stock</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["all", "All"],
                      ["out", "Not in stock"],
                      ["in", "In stock"],
                    ].map(([key, label]) => (
                      <button key={key} type="button" onClick={() => setStock(key)} className={chip(stock === key)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="text-xs text-text-muted">
                    <span className="mb-2 block font-medium uppercase tracking-wider">Size</span>
                    <select
                      value={sizeFilter}
                      onChange={(e) => setSizeFilter(e.target.value)}
                      className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
                    >
                      <option value="">All sizes</option>
                      {sizeOptions.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-text-muted">
                    <span className="mb-2 block font-medium uppercase tracking-wider">Sort</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
                    >
                      <option value="wanted">Most wanted</option>
                      <option value="name">Name (A–Z)</option>
                    </select>
                  </label>
                </div>
                {filterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text"
                  >
                    <LuX size={12} aria-hidden="true" /> Clear filters
                  </button>
                )}
              </div>
            )}

            <p className="mb-2 text-xs text-text-muted">
              Showing {shown.length} of {sourcing.length}
            </p>

            {shown.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface py-12 text-center">
                <p className="text-sm text-text-muted">Nothing matches your search or filters.</p>
              </div>
            ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            {shown.map((item, idx) => (
              <div
                key={`${item.product_key}-${item.size}`}
                className={`flex items-center justify-between px-5 py-4 ${idx !== shown.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-text-muted text-sm w-7">{item.rank}</span>
                  <div>
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-text-muted">{item.size || "One size"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.currently_in_stock ? (
                    <span className="text-xs bg-live/10 text-live px-2 py-0.5 rounded-full">
                      In stock
                    </span>
                  ) : (
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
          </>
        )}
      </div>
    </div>
  );
}
