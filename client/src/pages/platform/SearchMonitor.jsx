import { useEffect, useState } from "react";
import { LuSearch, LuSearchX, LuRefreshCw, LuSmartphone, LuMonitor, LuTablet } from "react-icons/lu";
import api from "../../lib/api.js";

// Shopper activity on the platform admin page: mobile vs desktop
// visitors on the stores' sites, and "What shoppers search": what people type
// into the stores' search bars (GET /api/platform/searches). Typing is
// merged into one search per person on the server, so "jordan 4" counts
// once, not as "j", "jo", "jor"… Refreshes every 30 seconds while open.

const RANGES = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];
const REFRESH_MS = 30 * 1000;

const count = (n) => Number(n || 0).toLocaleString();
const ago = (d) => {
  const minutes = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

// How a search went: found items, only close matches, or nothing
function ResultTag({ results, match }) {
  if (!results) {
    return <span className="text-[11px] px-1.5 py-0.5 rounded bg-danger/15 text-danger shrink-0">No results</span>;
  }
  if (match === "close") {
    return <span className="text-[11px] px-1.5 py-0.5 rounded bg-warn/15 text-warn shrink-0">Close only · {count(results)}</span>;
  }
  return <span className="text-[11px] px-1.5 py-0.5 rounded bg-text/10 text-text-muted shrink-0">{count(results)} found</span>;
}

const DEVICES = [
  { key: "mobile", label: "Mobile", icon: LuSmartphone, bar: "bg-primary" },
  { key: "desktop", label: "Desktop", icon: LuMonitor, bar: "bg-text/60" },
  { key: "tablet", label: "Tablet", icon: LuTablet, bar: "bg-text/30" },
];

// People on each kind of device. Someone on both their phone and laptop
// counts in both, so shares are of the device total.
function DeviceSplit({ devices }) {
  const people = (key) => devices.by_device.find((d) => d.device === key)?.people || 0;
  const total = DEVICES.reduce((sum, d) => sum + people(d.key), 0);
  const share = (key) => (total ? Math.round((people(key) / total) * 100) : 0);
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5 mb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Mobile vs desktop</h3>
        <p className="text-xs text-text-muted">
          {count(devices.people)} {devices.people === 1 ? "person" : "people"} on store sites · {count(devices.visits)} daily visits
        </p>
      </div>
      {total === 0 ? (
        <p className="text-sm text-text-muted mt-3">No visits in this time yet.</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-text/10" aria-hidden="true">
            {DEVICES.map((d) =>
              people(d.key) ? <div key={d.key} className={d.bar} style={{ width: `${(people(d.key) / total) * 100}%` }} /> : null,
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DEVICES.map(({ key, label, icon: Icon, bar }) => (
              <div key={key} className="flex items-center gap-2 min-w-0">
                <span className={`size-2.5 shrink-0 rounded-full ${bar}`} aria-hidden="true" />
                <Icon size={15} className="text-text-muted shrink-0" aria-hidden="true" />
                <span className="text-sm truncate">
                  {label} <span className="font-semibold">{share(key)}%</span>
                  <span className="text-text-muted text-xs"> · {count(people(key))}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const Panel = ({ title, hint, children, className = "" }) => (
  <section className={`rounded-xl border border-border bg-surface p-4 sm:p-5 min-w-0 ${className}`}>
    <h3 className="font-semibold">{title}</h3>
    {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

export default function SearchMonitor({ stores = [] }) {
  const [days, setDays] = useState(7);
  const [store, setStore] = useState("all");
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const filterKey = `${days}|${store}`;
  const [loadedKey, setLoadedKey] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get("/platform/searches", { params: { days, ...(store !== "all" && { store }) } })
      .then((res) => {
        if (!active) return;
        setData(res.data.data);
        setFailed(false);
        setLoadedKey(`${days}|${store}`);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [days, store, tick]);

  // Live: check again every 30 seconds while the tab is showing
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const loading = loadedKey !== filterKey;
  const totals = data?.totals;
  const noResultShare = totals?.searches ? Math.round((totals.no_results / totals.searches) * 100) : 0;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold">Shopper activity</h2>
          <p className="text-xs text-text-muted">
            Visits to the stores&apos; sites and what people search. Counts only, no names or emails.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            aria-label="Store"
            className="text-sm rounded-full border border-border bg-surface px-3 py-1.5 text-text"
          >
            <option value="all">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {RANGES.map((range) => (
              <button
                key={range.days}
                type="button"
                role="tab"
                aria-selected={days === range.days}
                onClick={() => setDays(range.days)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  days === range.days
                    ? "border-text bg-text text-bg"
                    : "border-border text-text-muted hover:text-text hover:border-text/30"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {failed && !data ? (
        <p className="text-sm text-danger">Couldn&apos;t load searches.</p>
      ) : !data || loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : (
        <>
          {data.devices && <DeviceSplit devices={data.devices} />}
          <h3 className="font-semibold mb-3 mt-6">What shoppers search</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            {[
              { label: "Searches", value: count(totals.searches) },
              { label: "People searching", value: count(totals.searchers) },
              { label: "Found nothing", value: `${noResultShare}%`, hint: `${count(totals.no_results)} searches` },
              { label: "Close matches only", value: count(totals.close_only) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-text-muted">{stat.label}</p>
                <p className="text-xl font-semibold mt-1">{stat.value}</p>
                {stat.hint && <p className="text-[11px] text-text-muted mt-0.5">{stat.hint}</p>}
              </div>
            ))}
          </div>

          {totals.searches === 0 ? (
            <p className="text-sm text-text-muted rounded-xl border border-border bg-surface p-4">
              No searches in this time yet.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Top searches" hint="By how many people searched it">
                <ol className="space-y-2.5">
                  {data.top.map((row, i) => (
                    <li key={row.term} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-text-muted shrink-0">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate" title={row.term}>
                        {row.term}
                      </span>
                      <ResultTag results={row.results} />
                      <span className="w-8 text-right text-text-muted shrink-0" title="People">
                        {count(row.searchers)}
                      </span>
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel
                title="Wanted, not found"
                hint="Searches with no results or only close matches: demand nobody's stocking (or a missing nickname)"
              >
                {data.missing.length === 0 ? (
                  <p className="text-sm text-text-muted">Every search found something.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {data.missing.map((row) => (
                      <li key={row.term} className="flex items-start gap-2 text-sm">
                        <LuSearchX size={15} className="mt-0.5 text-danger shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate" title={row.term}>
                            {row.term}
                          </p>
                          <p className="text-[11px] text-text-muted truncate">{row.store_names}</p>
                        </div>
                        <span className="text-text-muted shrink-0" title="People">
                          {count(row.searchers)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel
                title={
                  <span className="flex items-center gap-2">
                    Live <LuRefreshCw size={13} className="text-text-muted" aria-label="Refreshes every 30 seconds" />
                  </span>
                }
                hint="The latest searches, refreshed every 30 seconds"
              >
                <ul className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {data.recent.map((row) => (
                    <li key={row.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <LuSearch size={13} className="text-text-muted shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate" title={row.query}>
                          {row.query}
                        </span>
                        <ResultTag results={row.results} match={row.match} />
                      </div>
                      <p className="text-[11px] text-text-muted pl-5 truncate">
                        {row.store_name}
                        {row.source === "track" ? " · Track an item" : ""} · {ago(row.updated_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </>
      )}
    </section>
  );
}
