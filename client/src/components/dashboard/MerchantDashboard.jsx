import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LuTrendingUp,
  LuUsers,
  LuPackage,
  LuBellRing,
  LuShoppingBag,
  LuChevronRight,
} from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import api from "../../lib/api.js";

// `to`: the page with the details behind that number
const FUNNEL_STAGES = [
  { key: "alerts", label: "Active alerts", to: "/sourcing" },
  { key: "notified", label: "Notified" },
  { key: "clicked", label: "Clicked" },
  { key: "purchased", label: "Purchased", to: "/purchases" },
];

// 12480 → "$12,480.00"; 1284 → "1,284"
const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const count = (n) => Number(n || 0).toLocaleString();

// Shared look for rows that open another page
const ROW_LINK =
  "flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg border-b border-border last:border-0 hover:bg-text/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

export default function MerchantDashboard() {
  const [sourcing, setSourcing] = useState([]);
  const [loadingSourcing, setLoadingSourcing] = useState(true);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [revenue, setRevenue] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [customerCount, setCustomerCount] = useState(null);
  // Signups and clicks from the "Restock alerts" blocks on the Shopify site
  const [fromWebsite, setFromWebsite] = useState(null);

  useEffect(() => {
    api
      .get("/analytics/sourcing-demand")
      .then((res) => setSourcing(res.data.data || []))
      .catch((err) => console.error("Failed to load sourcing demand:", err))
      .finally(() => setLoadingSourcing(false));
  }, []);

  useEffect(() => {
    api
      .get("/analytics/purchases?limit=10")
      .then((res) => setRecentPurchases(res.data.data || []))
      .catch((err) => console.error("Failed to load recent purchases:", err))
      .finally(() => setLoadingPurchases(false));
  }, []);

  useEffect(() => {
    api
      .get("/analytics/revenue")
      .then((res) => setRevenue(res.data.data))
      .catch((err) => console.error("Failed to load revenue:", err));
  }, []);

  useEffect(() => {
    api
      .get("/analytics/funnel")
      .then((res) => setFunnel(res.data.data))
      .catch((err) => console.error("Failed to load funnel:", err));
  }, []);

  useEffect(() => {
    api
      .get("/analytics/customer-count")
      .then((res) => {
        setCustomerCount(res.data.data.count);
        setFromWebsite(res.data.data);
      })
      .catch((err) => console.error("Failed to load customer count:", err));
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar />

      <div className="flex-1 p-6 overflow-auto">
        <DashboardBody
          sourcing={sourcing}
          loadingSourcing={loadingSourcing}
          recentPurchases={recentPurchases}
          loadingPurchases={loadingPurchases}
          revenue={revenue}
          funnel={funnel}
          customerCount={customerCount}
          fromWebsite={fromWebsite}
        />
      </div>
    </div>
  );
}

// Everything right of the sidebar. The landing page's preview
// (marketing/DashboardPreview.jsx) draws this same view with sample data.
export function DashboardBody({
  sourcing,
  loadingSourcing,
  recentPurchases,
  loadingPurchases,
  revenue,
  funnel,
  customerCount,
  fromWebsite,
  // The preview passes a sample count; normally it's the demand list
  productsTracked,
}) {
  // Bars are sized against the biggest number. The stages aren't
  // subsets of each other (one alert can be clicked many times), so
  // sizing them against active alerts ran past 100%.
  const funnelBaseline = funnel
    ? Math.max(...FUNNEL_STAGES.map((stage) => funnel[stage.key] || 0))
    : 0;
  const funnelPercent = (value) =>
    funnelBaseline > 0 ? Math.round((value / funnelBaseline) * 100) : 0;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
          <p className="text-text-muted text-sm mt-1">
            Here's how your store is performing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={LuTrendingUp}
          label="Revenue attributed"
          value={revenue ? money(revenue.total_revenue) : "…"}
          to="/purchases"
          hint="See purchases"
        />
        <StatCard
          icon={LuUsers}
          label="Active customers"
          value={customerCount === null ? "…" : count(customerCount)}
          to="/customers"
          hint={
            fromWebsite?.website_clicks
              ? `${count(fromWebsite.from_website)} joined from your website (${count(fromWebsite.website_clicks)} clicks)`
              : "See customers"
          }
        />
        <StatCard
          icon={LuBellRing}
          label="Notifications sent"
          value={funnel ? count(funnel.notified) : "…"}
          onClick={() =>
            document.getElementById("funnel")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          hint="See the funnel"
        />
        <StatCard
          icon={LuPackage}
          label="Products tracked"
          value={loadingSourcing ? "…" : count(productsTracked ?? sourcing.length)}
          to="/sourcing"
          hint="See sourcing"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">What to source next</h3>
              <span className="text-xs text-text-muted">By active customer demand</span>
            </div>
            <Link to="/sourcing" className="text-xs text-text-muted hover:text-text transition-colors">
              View all →
            </Link>
          </div>
          {loadingSourcing ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : sourcing.length === 0 ? (
            <p className="text-sm text-text-muted">No active alerts yet.</p>
          ) : (
            <div className="space-y-1">
              {sourcing.slice(0, 8).map((item) => (
                <Link
                  to="/sourcing"
                  key={`${item.product_key}-${item.size}`}
                  className={ROW_LINK}
                >
                  <div>
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-text-muted">{item.size}</p>
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
                    <LuChevronRight size={14} className="text-text-muted" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div id="funnel" className="rounded-xl border border-border bg-surface p-6 scroll-mt-6">
          <h3 className="font-semibold mb-4">Notification funnel</h3>
          {!funnel ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : funnelBaseline === 0 ? (
            <p className="text-sm text-text-muted">
              Nothing yet — this fills in once customers start tracking
              shoes.
            </p>
          ) : (
            <div className="space-y-4">
              {FUNNEL_STAGES.map((stage) => (
                <div key={stage.key}>
                  <div className="flex justify-between items-center mb-1.5">
                    {stage.to ? (
                      <Link to={stage.to} className="text-sm text-text-muted hover:text-text underline-offset-4 hover:underline">
                        {stage.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-text-muted">{stage.label}</span>
                    )}
                    <span className="text-sm font-medium">
                      {count(funnel[stage.key])}
                    </span>
                  </div>
                  <div className="w-full bg-surface-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{
                        width: `${funnelPercent(funnel[stage.key])}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LuShoppingBag size={16} className="text-text-muted" />
            <h3 className="font-semibold">Recent purchases</h3>
          </div>
          <Link
            to="/purchases"
            className="text-xs text-text-muted hover:text-text transition-colors"
          >
            View all →
          </Link>
        </div>

        {loadingPurchases ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : recentPurchases.length === 0 ? (
          <p className="text-sm text-text-muted">No purchases yet.</p>
        ) : (
          <div className="space-y-1">
            {recentPurchases.map((p) => (
              <Link to="/purchases" key={p.id} className={ROW_LINK}>
                <div>
                  <p className="text-sm font-medium">{p.product_name}</p>
                  <p className="text-xs text-text-muted">
                    {p.size} · {new Date(p.purchased_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* How the sale was proven (attribution.service.js) */}
                  <span className="text-xs bg-live/10 text-live px-2 py-0.5 rounded-full">
                    {p.attribution_source === "pixel" ? "Buy it now" : "Syncstock checkout"}
                  </span>
                  <span className="text-sm font-semibold">
                    {money(p.price_paid)}
                  </span>
                  <LuChevronRight size={14} className="text-text-muted" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// A headline number that opens its details: a page (`to`) or an action
// on this page (`onClick`). The arrow and hint show it's clickable.
function StatCard({ icon: Icon, label, value, to, onClick, hint }) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
          <Icon size={18} className="text-text" />
        </div>
        <LuChevronRight
          size={16}
          className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-sm text-text-muted mb-1">{label}</h3>
      <p className="text-xl font-bold">{value}</p>
      {hint && <p className="mt-2 text-xs text-text-muted group-hover:text-text transition-colors">{hint}</p>}
    </>
  );
  const className =
    "group block w-full text-left p-5 rounded-xl border border-border bg-surface transition-colors hover:border-text/25 hover:bg-text/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
