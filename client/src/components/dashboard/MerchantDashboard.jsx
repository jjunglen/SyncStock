import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LuTrendingUp,
  LuUsers,
  LuPackage,
  LuBellRing,
  LuShoppingBag,
  LuBell,
} from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import api from "../../lib/api.js";

const FUNNEL_STAGES = [
  { key: "alerts", label: "Active alerts" },
  { key: "notified", label: "Notified" },
  { key: "clicked", label: "Clicked" },
  { key: "purchased", label: "Purchased" },
];

export default function MerchantDashboard() {
  const [sourcing, setSourcing] = useState([]);
  const [loadingSourcing, setLoadingSourcing] = useState(true);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [revenue, setRevenue] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [customerCount, setCustomerCount] = useState(null);

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
      .then((res) => setCustomerCount(res.data.data.count))
      .catch((err) => console.error("Failed to load customer count:", err));
  }, []);

  const funnelBaseline = funnel?.alerts || 0;
  const funnelPercent = (value) =>
    funnelBaseline > 0 ? Math.round((value / funnelBaseline) * 100) : 0;

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
            <p className="text-text-muted text-sm mt-1">
              Here's how your store is performing.
            </p>
          </div>
          <button className="relative p-2 rounded-lg bg-surface border border-border text-text-muted hover:text-text transition-colors">
            <LuBell size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={LuTrendingUp}
            label="Revenue attributed"
            value={revenue ? `$${revenue.total_revenue.toFixed(2)}` : "…"}
          />
          <StatCard
            icon={LuUsers}
            label="Active customers"
            value={customerCount === null ? "…" : customerCount}
          />
          <StatCard
            icon={LuBellRing}
            label="Notifications sent"
            value={funnel ? funnel.notified : "…"}
          />
          <StatCard
            icon={LuPackage}
            label="Products tracked"
            value={loadingSourcing ? "…" : sourcing.length}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">What to source next</h3>
              <span className="text-xs text-text-muted">
                By active customer demand
              </span>
            </div>
            {loadingSourcing ? (
              <p className="text-sm text-text-muted">Loading...</p>
            ) : sourcing.length === 0 ? (
              <p className="text-sm text-text-muted">No active alerts yet.</p>
            ) : (
              <div className="space-y-1">
                {sourcing.map((item) => (
                  <div
                    key={`${item.product_key}-${item.size}`}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-semibold mb-4">Notification funnel</h3>
            {!funnel ? (
              <p className="text-sm text-text-muted">Loading...</p>
            ) : funnelBaseline === 0 ? (
              <p className="text-sm text-text-muted">
                No active alerts yet — this fills in once customers start
                tracking shoes.
              </p>
            ) : (
              <div className="space-y-4">
                {FUNNEL_STAGES.map((stage) => (
                  <div key={stage.key}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-text-muted">
                        {stage.label}
                      </span>
                      <span className="text-sm font-medium">
                        {funnel[stage.key]}
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
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{p.product_name}</p>
                    <p className="text-xs text-text-muted">
                      {p.size} · {new Date(p.purchased_at).toLocaleDateString()}
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
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-surface">
      <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
        <Icon size={18} className="text-text" />
      </div>
      <h3 className="text-sm text-text-muted mb-1">{label}</h3>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
