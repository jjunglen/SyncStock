import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuLogOut,
  LuStore,
  LuDollarSign,
  LuUsers,
  LuBell,
  LuMousePointerClick,
  LuShoppingBag,
  LuFootprints,
  LuMail,
} from "react-icons/lu";
import api from "../../lib/api.js";
import SyncStockMark from "../../components/ui/SyncStockMark.jsx";
import SalesHistory from "./SalesHistory.jsx";
import SearchMonitor from "./SearchMonitor.jsx";
import SubdomainEditor from "./SubdomainEditor.jsx";
import { WantedItem, AllWanted } from "./WantedList.jsx";

// SyncStock's own admin page: how every store is doing, and what
// shoppers want across all of them. The server only answers for the
// one admin login (platformAdmin.middleware.js); everyone else gets
// "not found".

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const count = (n) => Number(n || 0).toLocaleString();
const date = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "sneakers", label: "Sneakers" },
  { key: "clothing", label: "Clothing & accessories" },
];
const CATEGORY_LABELS = { sneakers: "Sneakers", clothing: "Clothing & accessories", trading_cards: "Trading cards", other: "Other" };

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface min-w-0">
      <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
        <Icon size={18} className="text-text" />
      </div>
      <h3 className="text-sm text-text-muted mb-1">{label}</h3>
      <p className="text-xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

// Where a store is: live, still setting up, or removed SyncStock
function storeState(store) {
  if (store.uninstalled_at) return { label: "Uninstalled", className: "bg-danger/10 text-danger" };
  if (store.status === "active") return { label: "Live", className: "bg-live/10 text-live" };
  if (store.onboarding_step !== "complete") return { label: `Setup: ${store.onboarding_step}`, className: "bg-warn/10 text-warn" };
  return { label: store.status, className: "bg-text/10 text-text-muted" };
}

const billingLabel = (store) =>
  store.plan === "internal" || store.billing_status === "exempt" ? "Free (flagship)" : store.billing_status || "No plan";

function StoreRow({ store, days, onChanged }) {
  const state = storeState(store);
  return (
    <div className="p-4 border-b border-border last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{store.name}</p>
          <SubdomainEditor store={store} onChanged={(changes) => onChanged(store.id, changes)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full ${state.className}`}>{state.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-text/10 text-text-muted">{billingLabel(store)}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-text/10 text-text-muted">{store.shopify_app} app</span>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-text-muted">Customers</dt>
          <dd className="font-medium">
            {count(store.customers)}
            {store.new_customers > 0 && <span className="text-xs text-live"> +{count(store.new_customers)}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Active alerts</dt>
          <dd className="font-medium">{count(store.active_alerts)}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Sent ({days}d)</dt>
          <dd className="font-medium">{count(store.notified)}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Clicks ({days}d)</dt>
          <dd className="font-medium">{count(store.clicks)}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Purchases</dt>
          <dd className="font-medium">
            {count(store.purchases)} · {money(store.revenue)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">In stock</dt>
          <dd className="font-medium">{count(store.in_stock)}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Joined · last sync</dt>
          <dd className="font-medium">
            {date(store.created_at)} · {date(store.last_synced_at)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

// A simple horizontal bar list (sizes, brands)
function Bars({ rows, labelKey, emptyText }) {
  if (!rows?.length) return <p className="text-sm text-text-muted">{emptyText}</p>;
  const max = Math.max(...rows.map((r) => r.shoppers));
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row[labelKey]} className="text-sm">
          <div className="flex justify-between gap-2 mb-1">
            <span className="truncate">{row[labelKey]}</span>
            <span className="text-text-muted shrink-0">{count(row.shoppers)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-text/10">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(row.shoppers / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// The page's sections, in order, for the menu bar
const MENU = [
  { id: "overview", label: "Overview" },
  { id: "stores", label: "Stores" },
  { id: "wanted", label: "What shoppers want" },
  { id: "activity", label: "Shopper activity" },
  { id: "sales", label: "Sales history" },
];

// Menu bar under the header: jumps to a section, and highlights the one
// on screen. Scrolls sideways on phones.
function AdminMenu() {
  const [current, setCurrent] = useState("overview");

  useEffect(() => {
    const onScroll = () => {
      // The last section whose top has passed under the header
      let active = MENU[0].id;
      for (const { id } of MENU) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 160) active = id;
      }
      // At the very bottom, the last section counts even if it's short
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        active = [...MENU].reverse().find(({ id }) => document.getElementById(id))?.id || active;
      }
      setCurrent(active);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav aria-label="Admin sections" className="border-t border-border">
      <div className="mx-auto max-w-6xl flex gap-1 overflow-x-auto px-4 sm:px-6 py-2 [scrollbar-width:none]">
        {MENU.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              setCurrent(id);
            }}
            aria-current={current === id ? "true" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
              current === id ? "bg-text text-bg" : "text-text-muted hover:text-text hover:bg-text/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

const Panel = ({ title, hint, children }) => (
  <section className="rounded-xl border border-border bg-surface p-4 sm:p-5 min-w-0">
    <h2 className="font-semibold">{title}</h2>
    {hint && <p className="text-xs text-text-muted mt-0.5 mb-4">{hint}</p>}
    {!hint && <div className="mb-4" />}
    {children}
  </section>
);

export default function PlatformAdmin() {
  const [overview, setOverview] = useState(null);
  const [demand, setDemand] = useState(null);
  const [category, setCategory] = useState("all");
  const [showAllWanted, setShowAllWanted] = useState(false);
  const closeAllWanted = useCallback(() => setShowAllWanted(false), []);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/platform/overview")
      .then((res) => setOverview(res.data.data))
      .catch((err) => setError(err.response?.status === 404 ? "Page not found." : "Couldn't load stores."));
  }, []);

  useEffect(() => {
    setDemand(null);
    api
      .get("/platform/demand", { params: { category } })
      .then((res) => setDemand(res.data.data))
      .catch(() => setDemand({ failed: true }));
  }, [category]);

  const totals = overview?.totals;
  const days = overview?.recent_days || 30;
  const sizeGroups = demand?.sizes ? Object.entries(demand.sizes) : [];

  const logOut = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Logged out or not, leave the page
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen w-full bg-bg text-text">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 sm:px-6 h-14">
          <div className="flex items-center gap-2 min-w-0">
            <SyncStockMark size={24} className="text-text" />
            <span className="font-semibold truncate">SyncStock admin</span>
          </div>
          <button
            type="button"
            onClick={logOut}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
          >
            <LuLogOut size={16} />
            Log out
          </button>
        </div>
        <AdminMenu />
      </header>

      <div className="mx-auto max-w-6xl min-w-0 p-4 sm:p-6">
        <div>
          <h1 id="overview" className="font-display text-2xl font-semibold mb-1 scroll-mt-32">All stores</h1>
          <p className="text-text-muted text-sm mb-6">
            Every store on SyncStock. Counts only — no shopper names or emails.
          </p>

          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : !overview ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                <Stat
                  icon={LuStore}
                  label="Stores live"
                  value={`${count(totals.live)} of ${count(totals.stores)}`}
                  hint={`${count(totals.onboarding)} setting up · ${count(totals.uninstalled)} uninstalled`}
                />
                <Stat
                  icon={LuDollarSign}
                  label="Monthly revenue"
                  value={money(totals.mrr)}
                  hint={`${count(totals.paying)} paying ${totals.paying === 1 ? "store" : "stores"}`}
                />
                <Stat
                  icon={LuUsers}
                  label="Shoppers"
                  value={count(totals.shoppers)}
                  hint={`+${count(totals.new_shoppers)} in the last ${days} days`}
                />
                <Stat icon={LuBell} label="Active alerts" value={count(totals.active_alerts)} />
                <Stat icon={LuBell} label={`Alerts sent (${days}d)`} value={count(totals.notified)} />
                <Stat icon={LuMousePointerClick} label={`Clicks (${days}d)`} value={count(totals.clicks)} />
                <Stat
                  icon={LuShoppingBag}
                  label="Sales from alerts"
                  value={money(totals.revenue)}
                  hint={`${count(totals.purchases)} purchases · ${money(totals.recent_revenue)} in ${days}d`}
                />
                <Stat
                  icon={LuFootprints}
                  label={`Purchases (${days}d)`}
                  value={count(totals.recent_purchases)}
                />
                <Stat
                  icon={LuMail}
                  label={`Alert emails clicked (${days}d)`}
                  value={
                    totals.emails?.people
                      ? `${count(totals.emails.people_clicked)} of ${count(totals.emails.people)} people`
                      : "—"
                  }
                  hint={
                    totals.emails?.sent
                      ? `${Math.round((totals.emails.clicked / totals.emails.sent) * 100)}% of ${count(totals.emails.sent)} emails · ${count(totals.emails.clicks)} clicks`
                      : "Counting from the next alert email"
                  }
                />
              </div>

              <h2 id="stores" className="font-semibold mb-3 scroll-mt-32">Stores</h2>
              <div className="rounded-xl border border-border bg-surface mb-10">
                {overview.stores.length === 0 ? (
                  <p className="p-4 text-sm text-text-muted">No stores yet.</p>
                ) : (
                  overview.stores.map((store) => (
                    <StoreRow
                      key={store.id}
                      store={store}
                      days={days}
                      onChanged={(id, changes) =>
                        setOverview((o) => ({
                          ...o,
                          stores: o.stores.map((s) => (s.id === id ? { ...s, ...changes } : s)),
                        }))
                      }
                    />
                  ))
                )}
              </div>
            </>
          )}

          {!error && (
            <>
              <div id="wanted" className="flex flex-wrap items-end justify-between gap-3 mb-4 scroll-mt-32">
                <div>
                  <h2 className="font-semibold">What shoppers want</h2>
                  <p className="text-xs text-text-muted">Active alerts across every store.</p>
                </div>
                <div className="flex flex-wrap gap-1.5" role="tablist">
                  {CATEGORY_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={category === tab.key}
                      onClick={() => setCategory(tab.key)}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                        category === tab.key
                          ? "border-text bg-text text-bg"
                          : "border-border text-text-muted hover:text-text hover:border-text/30"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {!demand ? (
                <p className="text-sm text-text-muted">Loading...</p>
              ) : demand.failed ? (
                <p className="text-sm text-danger">Couldn't load demand.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 min-w-0">
                    <Panel title="Most wanted" hint="Top 10: shoppers waiting, and the sizes they want most">
                      {demand.most_wanted.length === 0 ? (
                        <p className="text-sm text-text-muted">No active alerts here yet.</p>
                      ) : (
                        <>
                        <ol className="divide-y divide-border">
                          {demand.most_wanted.map((item, i) => (
                            <WantedItem key={item.product_key} item={item} rank={i + 1} />
                          ))}
                        </ol>
                        {demand.wanted_total > demand.most_wanted.length && (
                          <button
                            type="button"
                            onClick={() => setShowAllWanted(true)}
                            className="mt-4 w-full rounded-lg border border-border py-2 text-sm text-text-muted hover:text-text hover:border-text/30 transition-colors"
                          >
                            See all {count(demand.wanted_total)}
                          </button>
                        )}
                        </>
                      )}
                    </Panel>
                  </div>

                  <div className="space-y-4 min-w-0">
                    <Panel title="Top brands" hint="Shoppers waiting on anything from the brand">
                      <Bars rows={demand.brands} labelKey="brand" emptyText="Nothing yet." />
                    </Panel>
                    {sizeGroups.length === 0 ? (
                      <Panel title="Most wanted sizes">
                        <p className="text-sm text-text-muted">Nothing yet.</p>
                      </Panel>
                    ) : (
                      sizeGroups.map(([group, rows]) => (
                        <Panel key={group} title={`Most wanted sizes · ${CATEGORY_LABELS[group] || group}`}>
                          <Bars rows={rows} labelKey="size" emptyText="Nothing yet." />
                        </Panel>
                      ))
                    )}
                  </div>

                  <div className="lg:col-span-3 min-w-0">
                    <Panel title="Best sellers from alerts" hint="Purchases SyncStock led to, across every store">
                      {demand.best_sellers.length === 0 ? (
                        <p className="text-sm text-text-muted">No sales from alerts here yet.</p>
                      ) : (
                        <ol className="divide-y divide-border">
                          {demand.best_sellers.map((item, i) => (
                            <li key={item.product_key} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 text-sm">
                              <span className="w-5 text-text-muted shrink-0">{i + 1}</span>
                              <span className="min-w-0 flex-1 truncate">{item.product_name}</span>
                              <span className="shrink-0 text-text-muted">
                                {count(item.purchases)} sold · {money(item.revenue)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </Panel>
                  </div>
                </div>
              )}
            </>
          )}

          {showAllWanted && <AllWanted category={category} onClose={closeAllWanted} />}
          {!error && overview && (
            <div id="activity" className="scroll-mt-32">
              <SearchMonitor stores={overview.stores} />
            </div>
          )}
          {!error && overview && (
            <div id="sales" className="scroll-mt-32">
              <SalesHistory stores={overview.stores} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
