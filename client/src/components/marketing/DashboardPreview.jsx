import {
  LuLayoutDashboard,
  LuTrendingUp,
  LuShoppingBag,
  LuUsers,
  LuSettings,
  LuBellRing,
  LuPackage,
} from "react-icons/lu";

// Static look-alike of the merchant dashboard for the landing page hero.
// Sample data only — a real screenshot would expose a store's customers
// and revenue. Keep it in step with components/dashboard/MerchantDashboard.

const NAV = [
  { label: "Dashboard", icon: LuLayoutDashboard, active: true },
  { label: "Sourcing", icon: LuTrendingUp },
  { label: "Purchases", icon: LuShoppingBag },
  { label: "Customers", icon: LuUsers },
  { label: "Account", icon: LuSettings },
];

const STATS = [
  { label: "Revenue attributed", value: "$12,480", icon: LuTrendingUp },
  { label: "Active customers", value: "1,284", icon: LuUsers },
  { label: "Notifications sent", value: "8,932", icon: LuBellRing },
  { label: "Products tracked", value: "342", icon: LuPackage },
];

const DEMAND = [
  { name: "Jordan 4 Retro Bred", size: "10M/11.5W", waiting: 48 },
  { name: "Nike Dunk Low Panda", size: "9M/10.5W", waiting: 36 },
  { name: "New Balance 550 White Green", size: "11M/12.5W", waiting: 27 },
  { name: "Essentials Hoodie", size: "L", waiting: 19 },
];

const FUNNEL = [
  { label: "Active alerts", value: 100 },
  { label: "Notified", value: 72 },
  { label: "Clicked", value: 41 },
  { label: "Purchased", value: 18 },
];

const PURCHASES = [
  { name: "Jordan 1 High Chicago", size: "10.5M/12W", price: "$385" },
  { name: "Yeezy 350 V2 Onyx", size: "9.5M/11W", price: "$240" },
  { name: "Dunk Low Grey Fog", size: "8M/9.5W", price: "$145" },
];

export default function DashboardPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of the Syncstock merchant dashboard with sample data"
      className="flex w-full text-left text-text bg-bg select-none"
    >
      <aside className="hidden md:flex flex-col gap-1 w-44 shrink-0 border-r border-border p-3">
        <p className="font-display font-semibold text-sm px-2 py-2 mb-2">
          Your Store
        </p>
        {NAV.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            className={`flex items-center gap-2 text-xs px-2 py-2 rounded-md ${
              active ? "bg-text/5 text-text" : "text-text-muted"
            }`}
          >
            <Icon size={14} /> {label}
          </div>
        ))}
      </aside>

      <div className="flex-1 min-w-0 p-4 md:p-6">
        <p className="text-base font-semibold">Welcome back</p>
        <p className="text-xs text-text-muted mb-4">
          Here's how your store is performing.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-3 rounded-lg border border-border bg-surface">
              <div className="p-1.5 bg-primary/10 rounded-md w-fit mb-2">
                <Icon size={14} />
              </div>
              <p className="text-[11px] text-text-muted">{label}</p>
              <p className="text-base font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">What to source next</p>
              <span className="text-[11px] text-text-muted">By customer demand</span>
            </div>
            <div className="divide-y divide-border">
              {DEMAND.map((d) => (
                <div key={d.name} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{d.name}</p>
                    <p className="text-[11px] text-text-muted">{d.size}</p>
                  </div>
                  <span className="text-[11px] text-text-muted shrink-0">
                    {d.waiting} waiting
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-semibold mb-3">Alert funnel</p>
            <div className="flex flex-col gap-2.5">
              {FUNNEL.map((f) => (
                <div key={f.label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-muted">{f.label}</span>
                    <span>{f.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-text/10 overflow-hidden">
                    <div className="h-full rounded-full bg-live" style={{ width: `${f.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden sm:block rounded-lg border border-border bg-surface p-4 mt-3">
          <p className="text-sm font-semibold mb-2">Recent purchases from alerts</p>
          <div className="divide-y divide-border">
            {PURCHASES.map((p) => (
              <div key={p.name} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-text-muted">{p.size}</p>
                </div>
                <span className="text-xs font-medium">{p.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
