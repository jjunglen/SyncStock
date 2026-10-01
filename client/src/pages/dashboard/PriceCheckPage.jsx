import { useCallback, useEffect, useState } from "react";
import { LuScale, LuRefreshCw, LuExternalLink, LuTag } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";

// /price-check — the store's brand-new, original-box pairs against StockX
// (server: priceCheck.service.js). Flagship store only for now. Shoppers
// never see this.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "below_bid", label: "Below bid" },
  { key: "above_ask", label: "Above ask" },
  { key: "own", label: "Ask is yours" },
  { key: "not_compared", label: "Not compared" },
];

const STATUS = {
  below_bid: { label: (r) => `$${r.below_bid_by} below bid`, className: "bg-warn/10 text-warn" },
  above_ask: { label: () => "Above ask", className: "bg-danger/10 text-danger" },
  priced_right: { label: () => "Priced right", className: "bg-live/10 text-live" },
  no_product: { label: () => "Not on StockX", className: "bg-text/5 text-text-muted" },
  no_size: { label: () => "Size not matched", className: "bg-text/5 text-text-muted" },
  not_checked: { label: () => "Not checked yet", className: "bg-text/5 text-text-muted" },
  // On StockX, but no asks or bids for this size right now
  matched: { label: () => "No StockX prices", className: "bg-text/5 text-text-muted" },
};
const COMPARED = ["below_bid", "above_ask", "priced_right"];

// Biggest opportunities first
const rank = (r) =>
  r.status === "below_bid" ? 4e6 + r.below_bid_by : r.status === "above_ask" ? 3e6 + (r.vs_ask || 0) : r.status === "priced_right" ? 2e6 : 0;

const money = (n) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);

function Stat({ label, value, tone = "" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

export default function PriceCheckPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(
    () =>
      api
        .get("/analytics/price-check")
        .then((res) => {
          setData(res.data.data);
          setError("");
        })
        .catch((err) => setError(err.response?.data?.message || "Couldn't load the price check")),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // While a check runs, refresh the page every few seconds
  const running = !!data?.progress?.running;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [running, load]);

  const refresh = () => api.post("/analytics/price-check/refresh").then(load).catch(load);

  const rows = (data?.rows || [])
    .filter((r) =>
      filter === "all"
        ? true
        : filter === "own"
          ? r.own_lowest_ask
          : filter === "not_compared"
            ? !COMPARED.includes(r.status)
            : r.status === filter,
    )
    .sort((a, b) => rank(b) - rank(a));
  const s = data?.summary;

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar />
      <div className="flex-1 p-6 overflow-auto min-w-0">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuScale size={18} className="text-text" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">Price check</h1>
              <p className="text-text-muted text-sm">
                Brand new, original box only. Prices before StockX fees.
                {data?.checked_at && ` Updated ${new Date(data.checked_at).toLocaleString()}.`}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={running}>
            {running ? (
              <span className="flex items-center gap-2">
                <Spinner size={14} /> Checking {data.progress.done}/{data.progress.total || "…"}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LuRefreshCw size={14} /> Refresh prices
              </span>
            )}
          </Button>
        </div>

        {error && <p className="text-danger text-sm mb-4">{error}</p>}
        {!data && !error && <Spinner size={20} />}

        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              <Stat label="Pairs compared" value={`${s.compared}/${s.pairs}`} />
              <Stat label="Below highest bid" value={s.below_bid} tone="text-warn" />
              <Stat label="Above lowest ask" value={s.above_ask} tone="text-danger" />
              <Stat label="Money left on table" value={money(s.money_left)} />
              <Stat label="Lowest ask is yours" value={s.own_lowest_ask} />
            </div>

            <div className="flex gap-2 flex-wrap mb-4" role="tablist" aria-label="Filter">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    filter === f.key
                      ? "bg-primary text-primary-text border-primary"
                      : "border-border text-text hover:bg-text/5"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {s.pairs > 0 && s.compared === 0 && !running && (
              <p className="text-sm text-text-muted mb-4">
                Nothing compared yet — press <strong>Refresh prices</strong>. The first check takes about 10 minutes.
              </p>
            )}

            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="hidden md:grid grid-cols-[minmax(0,2.4fr)_0.8fr_0.9fr_0.9fr_0.9fr_1.4fr_auto] gap-3 px-4 py-2.5 text-xs text-text-muted border-b border-border">
                <span>Pair</span>
                <span>Yours</span>
                <span>Lowest ask</span>
                <span>vs ask</span>
                <span>Highest bid</span>
                <span>Status</span>
                <span className="sr-only">Open</span>
              </div>
              {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-text-muted">Nothing here.</p>}
              {rows.map((r) => {
                const st = STATUS[r.status] || STATUS.not_checked;
                return (
                  <a
                    key={r.id}
                    href={r.shopify_admin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Shopify to change the price"
                    className="grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[minmax(0,2.4fr)_0.8fr_0.9fr_0.9fr_0.9fr_1.4fr_auto] gap-x-3 gap-y-1 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-text/5 transition-colors text-sm"
                  >
                    <span className="flex items-center gap-3 min-w-0 col-span-2 md:col-span-1">
                      <span className="h-10 w-10 shrink-0 rounded-md bg-white overflow-hidden">
                        {r.image_url && <img src={r.image_url} alt="" className="h-full w-full object-contain p-0.5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium truncate">{r.product_name}</span>
                        <span className="block text-xs text-text-muted">
                          {r.style_id} · {r.size}
                        </span>
                      </span>
                    </span>
                    <span className="md:contents text-xs md:text-sm col-span-2 flex flex-wrap gap-x-4 gap-y-1 pl-[52px] md:pl-0">
                      <span>
                        <span className="md:hidden text-text-muted">Yours </span>
                        {money(r.price)}
                      </span>
                      <span>
                        <span className="md:hidden text-text-muted">Ask </span>
                        {money(r.lowest_ask)}
                      </span>
                      <span className={r.vs_ask == null ? "text-text-muted" : r.vs_ask > 0 ? "text-danger" : "text-live"}>
                        {r.vs_ask == null ? "—" : r.vs_ask > 0 ? `$${r.vs_ask} over` : r.vs_ask < 0 ? `$${-r.vs_ask} under` : "Same"}
                      </span>
                      <span>
                        <span className="md:hidden text-text-muted">Bid </span>
                        {money(r.highest_bid)}
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.className}`}>{st.label(r)}</span>
                        {r.own_lowest_ask && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-text inline-flex items-center gap-1">
                            <LuTag size={11} aria-hidden="true" /> Ask is yours
                          </span>
                        )}
                      </span>
                    </span>
                    <LuExternalLink size={14} className="hidden md:block text-text-muted" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
            <p className="text-xs text-text-muted mt-3">
              Below bid: someone on StockX is offering more than your price right now (flagged from $1). Click a pair
              to change its price in Shopify.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
