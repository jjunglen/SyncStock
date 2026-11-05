import { useState } from "react";
import { LuExternalLink, LuArrowUp, LuArrowDown, LuArrowUpDown, LuSearch } from "react-icons/lu";
import SalesImport from "./SalesImport.jsx";

// Pricing → "Your listings": each in-stock listing against what this
// store's own past sales of the same item went for (server:
// listingPrices.service.js). Works for any product with sales history.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "above", label: "Above usual" },
  { key: "below", label: "Below usual" },
  { key: "in_line", label: "In line" },
  { key: "no_history", label: "No sales yet" },
];

const STATUS = {
  above: { label: (r) => `$${r.vs_typical} above usual`, className: "bg-danger/10 text-danger" },
  below: { label: (r) => `$${-r.vs_typical} below usual`, className: "bg-warn/10 text-warn" },
  in_line: { label: () => "In line", className: "bg-live/10 text-live" },
  no_history: { label: () => "No sales yet", className: "bg-text/5 text-text-muted" },
};

// Status order for the default sort: biggest gaps first
const rank = (r) =>
  r.status === "above" || r.status === "below" ? 2e6 + Math.abs(r.vs_typical || 0) : r.status === "in_line" ? 1e6 : 0;

const COLUMNS = [
  { key: "pair", label: "Item", value: (r) => r.product_name?.toLowerCase() || null, firstDir: "asc" },
  { key: "price", label: "Yours", value: (r) => r.price, firstDir: "desc" },
  { key: "typical", label: "Usually sells", value: (r) => r.typical_sale, firstDir: "desc" },
  { key: "vs", label: "vs usual", value: (r) => r.vs_typical, firstDir: "desc" },
  { key: "sales", label: "Sales", value: (r) => r.sales || null, firstDir: "desc" },
  { key: "status", label: "Status", value: (r) => rank(r), firstDir: "desc" },
];
const GRID = "md:grid-cols-[minmax(0,2.4fr)_0.8fr_1fr_0.9fr_0.7fr_1.4fr_auto]";

const money = (n) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);

function Stat({ label, value, tone = "" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

// data: GET /analytics/listing-prices; onImported: reload after a sales import
export default function ListingsVsSales({ data, onImported }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "status", dir: "desc" });
  const sortBy = (col) =>
    setSort((cur) =>
      cur.key === col.key ? { key: col.key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key: col.key, dir: col.firstDir },
    );

  const s = data.summary;
  // No sales yet: the import is the whole tab
  if (!data.has_sales) return <SalesImport onImported={onImported} />;

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const col = COLUMNS.find((c) => c.key === sort.key) || COLUMNS[5];
  const rows = data.rows
    .filter((r) => filter === "all" || r.status === filter)
    .filter((r) => {
      const text = `${r.product_name} ${r.sku || ""} ${r.size || ""}`.toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .sort((a, b) => {
      const x = col.value(a);
      const y = col.value(b);
      // Rows with nothing to compare always go last
      if (x == null || y == null) return x == null ? (y == null ? rank(b) - rank(a) : 1) : -1;
      const diff = typeof x === "string" ? x.localeCompare(y) : Number(x) - Number(y);
      return (sort.dir === "asc" ? diff : -diff) || rank(b) - rank(a);
    });
  // A long list renders in pages of 200 so the page stays quick
  const shown = rows.slice(0, 200);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-text-muted">
          Each listing against what the same item usually sold for in your past sales — same condition, and the same
          size when it has 3+ sales. Within {data.band_percent}% counts as in line.
        </p>
        <SalesImport onImported={onImported} compact />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Listings with sales history" value={`${s.with_history}/${s.listings}`} />
        <Stat label="Above usual" value={s.above} tone="text-danger" />
        <Stat label="Below usual" value={s.below} tone="text-warn" />
        <Stat label="In line" value={s.in_line} tone="text-live" />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.key ? "bg-primary text-primary-text border-primary" : "border-border text-text hover:bg-text/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative md:w-64">
          <LuSearch
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU or size"
            aria-label="Search listings"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm placeholder:text-text-muted focus:border-text/30 focus:outline-none"
          />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className={`hidden md:grid ${GRID} gap-3 px-4 py-2.5 text-xs text-text-muted border-b border-border`}>
          {COLUMNS.map((c) => {
            const active = sort.key === c.key;
            const Icon = !active ? LuArrowUpDown : sort.dir === "asc" ? LuArrowUp : LuArrowDown;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => sortBy(c)}
                aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                className={`flex items-center gap-1 text-left hover:text-text transition-colors ${active ? "text-text font-medium" : ""}`}
              >
                {c.label}
                <Icon size={12} className={active ? "" : "opacity-40"} aria-hidden="true" />
              </button>
            );
          })}
          <span className="sr-only">Open</span>
        </div>
        {shown.length === 0 && <p className="px-4 py-10 text-center text-sm text-text-muted">Nothing here.</p>}
        {shown.map((r) => {
          const st = STATUS[r.status] || STATUS.no_history;
          const Row = r.shopify_admin_url ? "a" : "div";
          return (
            <Row
              key={r.id}
              {...(r.shopify_admin_url && {
                href: r.shopify_admin_url,
                target: "_blank",
                rel: "noopener noreferrer",
                title: "Open in Shopify to change the price",
              })}
              className={`grid grid-cols-[auto_minmax(0,1fr)] ${GRID} gap-x-3 gap-y-1 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-text/5 transition-colors text-sm`}
            >
              <span className="flex items-center gap-3 min-w-0 col-span-2 md:col-span-1">
                <span className="h-10 w-10 shrink-0 rounded-md bg-white overflow-hidden">
                  {r.image_url && <img src={r.image_url} alt="" className="h-full w-full object-contain p-0.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium truncate">{r.product_name}</span>
                  <span className="block text-xs text-text-muted">
                    {[r.sku, r.size || "One size", r.condition === "used" ? "Pre-owned" : "New"].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </span>
              <span className="md:contents text-xs md:text-sm col-span-2 flex flex-wrap gap-x-4 gap-y-1 pl-[52px] md:pl-0">
                <span>
                  <span className="md:hidden text-text-muted">Yours </span>
                  {money(r.price)}
                </span>
                <span>
                  <span className="md:hidden text-text-muted">Usually </span>
                  {money(r.typical_sale)}
                  {r.basis === "all_sizes" && (
                    <span className="block text-[11px] text-text-muted" title="Not enough sales in this size, so every size is used">
                      all sizes
                    </span>
                  )}
                </span>
                <span className={r.vs_typical == null ? "text-text-muted" : r.vs_typical > 0 ? "text-danger" : r.vs_typical < 0 ? "text-warn" : "text-live"}>
                  {r.vs_typical == null
                    ? "—"
                    : r.vs_typical > 0
                      ? `$${r.vs_typical} over`
                      : r.vs_typical < 0
                        ? `$${-r.vs_typical} under`
                        : "Same"}
                </span>
                <span className="text-text-muted">
                  <span className="md:hidden">Sales </span>
                  {r.sales || "—"}
                  {r.sales > 0 && r.sales < 3 && <span className="ml-1 text-[11px]">(few)</span>}
                </span>
                <span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${st.className}`}>{st.label(r)}</span>
                </span>
              </span>
              {r.shopify_admin_url ? (
                <LuExternalLink size={14} className="hidden md:block text-text-muted" aria-hidden="true" />
              ) : (
                <span className="hidden md:block" />
              )}
            </Row>
          );
        })}
      </div>
      <p className="text-xs text-text-muted mt-3">
        {rows.length > shown.length
          ? `Showing the first ${shown.length} of ${rows.length} — search or filter to narrow it down. `
          : `${rows.length} listing${rows.length === 1 ? "" : "s"}. `}
        "Usually sells" is the middle sale price (before fees) from the last 6 months, or all your sales if there are
        fewer than 3 recent ones. Click a listing to change its price in Shopify.
      </p>
    </>
  );
}
