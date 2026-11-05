import { useState } from "react";
import { LuSearch, LuPackageX } from "react-icons/lu";
import Spinner from "../ui/Spinner.jsx";
import api from "../../lib/api.js";

// The trade-in price guide: search a SKU or name → each item (grouped by
// SKU) → brand new / pre-owned → size, with the typical payout, days to
// sell and the suggested offer at the store's margins.
//   endpoint — "/sell/store/guide" (merchant) or "/platform/sales/lookup"
//   params   — extra query params (the admin page passes the store)

const money = (n) => (n === null || n === undefined ? "—" : `$${Math.round(n).toLocaleString()}`);
const CONDITION = { new: "Brand new", used: "Pre-owned" };
const MATCHED = { sku: null, fixed_sku: "SKU typos fixed", borrowed_sku: "Some matched by title", title: "Matched by name — no SKU" };

export function Confidence({ value, sales }) {
  const styles = {
    exact: ["bg-live/10 text-live", sales ? `${sales} sales` : "Exact size"],
    few: ["bg-warn/10 text-warn", `Only ${sales} sale${sales === 1 ? "" : "s"}`],
    estimate: ["bg-warn/10 text-warn", "Estimate · all sizes"],
    none: ["bg-danger/10 text-danger", "Price manually"],
  };
  const [className, label] = styles[value] || styles.none;
  return <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}>{label}</span>;
}

function ConditionBlock({ condition, data }) {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{CONDITION[condition]}</p>
        <p className="text-xs text-text-muted">
          {data.overall
            ? `${data.overall.sales} sales · typical payout ${money(data.overall.typical_payout)} · offer ${money(data.overall.offer)} at ${data.margin}%`
            : `${data.margin}% margin`}
        </p>
      </div>
      {data.sizes.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="py-1.5 pr-3 font-medium">Size</th>
                <th className="py-1.5 pr-3 font-medium">Sales</th>
                <th className="py-1.5 pr-3 font-medium">Typical payout</th>
                <th className="py-1.5 pr-3 font-medium">Usually pay</th>
                <th className="py-1.5 pr-3 font-medium">Sells in</th>
                <th className="py-1.5 font-medium text-right">Offer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.sizes.map((s) => (
                <tr key={s.size}>
                  <td className="py-2 pr-3 font-medium">{s.size}</td>
                  <td className="py-2 pr-3">{s.sales}</td>
                  <td className="py-2 pr-3">{money(s.typical_payout)}</td>
                  <td className="py-2 pr-3 text-text-muted">{money(s.typical_paid)}</td>
                  <td className="py-2 pr-3 text-text-muted">{s.days_to_sell === null ? "—" : `~${s.days_to_sell} days`}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <span className="font-semibold mr-2">{money(s.offer)}</span>
                    <Confidence value={s.confidence} sales={s.sales} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.box_issue && (
        <p className="mt-2 text-xs text-text-muted flex items-center gap-1.5">
          <LuPackageX size={13} aria-hidden="true" />
          Box issues (no box, damaged, replacement): {data.box_issue.sales} sales · payout {money(data.box_issue.typical_payout)} · offer{" "}
          {money(data.box_issue.offer)}
        </p>
      )}
    </div>
  );
}

export default function PriceGuide({ endpoint = "/sell/store/guide", params = {}, disabled = false }) {
  const [q, setQ] = useState("");
  const [size, setSize] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const search = async (e) => {
    e.preventDefault();
    if (q.trim().length < 2 || disabled) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.get(endpoint, { params: { ...params, q: q.trim(), size: size.trim() || undefined } });
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't look that up.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={search} className="flex flex-col sm:flex-row gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Style code or name — CT8012-005, Jordan 4 Black Cat"
          aria-label="Style code or name"
          className="flex-1 min-w-0 rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-text/10"
        />
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="Size (optional)"
          aria-label="Size"
          className="sm:w-36 rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-text/10"
        />
        <button
          type="submit"
          disabled={busy || q.trim().length < 2 || disabled}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-text disabled:opacity-50"
        >
          {busy ? <Spinner size={16} /> : <LuSearch size={16} />} Look up
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {result &&
        (result.items.length === 0 ? (
          <p className="mt-5 text-sm text-text-muted">
            No sales for “{result.query}”{result.size && ` in size ${result.size}`}. Price this one by hand.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {result.groups > result.items.length && (
              <p className="text-xs text-text-muted">
                Showing the {result.items.length} items with the most sales out of {result.groups}. Search a SKU to narrow it down.
              </p>
            )}
            {result.items.map((item) => (
              <div key={item.key} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-text-muted">
                      {item.style_code || "No SKU"} · {item.sales} sales
                      {MATCHED[item.matched_by] && ` · ${MATCHED[item.matched_by]}`}
                    </p>
                  </div>
                </div>
                {["new", "used"].map((c) => item.conditions[c] && <ConditionBlock key={c} condition={c} data={item.conditions[c]} />)}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
