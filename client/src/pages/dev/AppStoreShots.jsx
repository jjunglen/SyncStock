import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LuHouse,
  LuInbox,
  LuTag,
  LuUsers,
  LuChartColumn,
  LuSearch,
  LuBell,
  LuLayoutGrid,
  LuTrendingUp,
  LuScale,
  LuRuler,
  LuMail,
} from "react-icons/lu";
import { DashboardBody } from "../../components/dashboard/MerchantDashboard.jsx";
import ProductCard from "../../components/dashboard/ProductCard.jsx";
import AlertCard from "../../components/dashboard/AlertCard.jsx";
import CardPrefsPicker from "../../components/dashboard/CardPrefsPicker.jsx";

// Dev only (/dev/app-store?shot=dashboard): 1600×900 Shopify App Store
// images — a headline over the real SyncStock screens, drawn with sample
// data. Captured with headless Chrome (see the shot list below).

const IMG = {
  bapeWhite: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/1c0031e3-575e-4f89-b01b-cf612f1dec6d.png?v=1793138362",
  j4: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/cc4be9aa-763a-4fc1-a0b9-4c6bb56504ca.png?v=1792791332",
  cream: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/e91e0e79-127b-414a-8756-a6942f4e6282.png?v=1793138083",
  bapeCamo: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/174945a5-e80a-4cd6-856a-620ad2054caa.png?v=1793836010",
  hoodie: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/547ada92-72a6-4786-b3d3-3aea992b0b9f.webp?v=1767480050",
  tee: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/e1d11691-0512-4405-8b76-e9f2a82cf843.webp?v=1759948193",
  etb: "https://cdn.shopify.com/s/files/1/0702/0399/8482/files/bd77c45c-d20e-4d96-98e1-21ca450d985b.webp?v=1793462899",
};

const daysAgo = (d) => new Date(Date.now() - d * 864e5).toISOString();

// Headline with the accented words in blue: "Turn [sold-out] into sales"
function Headline({ text }) {
  const parts = text.split(/(\[[^\]]+\])/);
  return (
    <h1 style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a", lineHeight: 1.05, textAlign: "center" }}>
      {parts.map((p, i) =>
        p.startsWith("[") ? (
          <span key={i} style={{ color: "#2563eb" }}>
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </h1>
  );
}

// The Shopify admin around an embedded app: dark top bar, admin nav, and
// the SyncStock pages under Apps
function AdminFrame({ active, children }) {
  const nav = [
    [LuHouse, "Home"],
    [LuInbox, "Orders"],
    [LuTag, "Products"],
    [LuUsers, "Customers"],
    [LuChartColumn, "Analytics"],
  ];
  const app = [
    [LuLayoutGrid, "Dashboard"],
    [LuTrendingUp, "Sourcing"],
    [LuScale, "Pricing"],
    [LuRuler, "Size settings"],
  ];
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #d4d4d8", background: "#f1f1f1", boxShadow: "0 30px 60px -20px rgba(30,41,90,0.35)" }}>
      <div style={{ height: 52, background: "#1a1a1a", display: "flex", alignItems: "center", padding: "0 18px", gap: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "#3a3a3a" }} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 460, height: 32, borderRadius: 9, background: "#303030", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", color: "#a3a3a3", fontSize: 14 }}>
            <LuSearch size={15} /> Search
          </div>
        </div>
        <LuBell size={18} color="#d4d4d4" />
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#303030", borderRadius: 9, padding: "5px 6px 5px 12px", color: "#e5e5e5", fontSize: 14 }}>
          Your Store <span style={{ width: 24, height: 24, borderRadius: 6, background: "#22c55e", color: "#052e16", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>YS</span>
        </div>
      </div>
      <div style={{ display: "flex", height: 640 }}>
        <div style={{ width: 220, background: "#ebebeb", padding: "14px 10px", fontSize: 14, color: "#303030" }}>
          {nav.map(([Icon, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px" }}>
              <Icon size={16} /> {label}
            </div>
          ))}
          <div style={{ margin: "14px 10px 6px", fontSize: 12, color: "#616161", fontWeight: 600 }}>Apps</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "#fff", borderRadius: 8, fontWeight: 600 }}>
            <img src="/syncstock-icon.png" alt="" style={{ width: 18, height: 18, borderRadius: 4 }} onError={(e) => (e.target.style.display = "none")} />
            SyncStock
          </div>
          {app.map(([Icon, label]) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 6px 30px", fontSize: 13, color: label === active ? "#1a1a1a" : "#616161", fontWeight: label === active ? 600 : 400 }}
            >
              <Icon size={14} /> {label}
            </div>
          ))}
        </div>
        <div className="bg-bg text-text" style={{ flex: 1, overflow: "hidden", padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// A shopper's browser window (the store's SyncStock site)
// zoom: scales the page inside so it fills the image
function BrowserFrame({ url, children, zoom = 1 }) {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #d4d4d8", background: "#fff", boxShadow: "0 30px 60px -20px rgba(30,41,90,0.35)" }}>
      <div style={{ height: 44, background: "#f4f4f5", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />
        ))}
        <div style={{ marginLeft: 16, flex: 1, maxWidth: 520, height: 28, borderRadius: 8, background: "#fff", border: "1px solid #e4e4e7", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 13, color: "#52525b" }}>
          {url}
        </div>
      </div>
      <div className="bg-bg text-text" style={{ overflow: "hidden" }}>
        <div style={{ zoom }}>{children}</div>
      </div>
    </div>
  );
}

function Canvas({ headline, children }) {
  return (
    <div
      style={{
        width: 1600,
        height: 900,
        overflow: "hidden",
        background: "radial-gradient(1200px 600px at 50% -10%, #e0e7ff 0%, #eef2ff 40%, #f8fafc 75%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "44px 80px 0",
        fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <Headline text={headline} />
      <div style={{ width: "100%", marginTop: 34 }}>{children}</div>
    </div>
  );
}

// ---- The shots -------------------------------------------------------------

const SOURCING = [
  { product_key: "j4", product_name: "Air Jordan 4 Retro OG SP Nigel Sylvester Brick by Brick", size: "10M/11.5W", demand_count: 48, currently_in_stock: false },
  { product_key: "bape", product_name: "A Bathing Ape Bape Sta Low Crazy White", size: "9M/10.5W", demand_count: 36, currently_in_stock: true },
  { product_key: "cream", product_name: "adidas Yeezy Boost 350 V2 Cream", size: "11M/12.5W", demand_count: 27, currently_in_stock: false },
  { product_key: "hoodie", product_name: "BAPE Color Camo Pullover Hoodie Red", size: "L", demand_count: 22, currently_in_stock: true },
];
const PURCHASES = [
  { id: "1", product_name: "A Bathing Ape Bape Sta Low Crazy White", size: "10.5M/12W", purchased_at: daysAgo(0), attribution_source: "cart_tag", price_paid: "325.00" },
  { id: "2", product_name: "adidas Yeezy Boost 350 V2 Cream", size: "11.5M/13W", purchased_at: daysAgo(1), attribution_source: "pixel", price_paid: "270.00" },
  { id: "3", product_name: "BAPE Color Camo Pullover Hoodie Red", size: "L", purchased_at: daysAgo(2), attribution_source: "cart_tag", price_paid: "350.00" },
];

function DashboardShot() {
  return (
    <Canvas headline="Turn [sold-out] into sales">
      <AdminFrame active="Dashboard">
        <div style={{ transform: "scale(0.92)", transformOrigin: "top left", width: "108.7%" }}>
          <DashboardBody
            sourcing={SOURCING}
            loadingSourcing={false}
            productsTracked={342}
            recentPurchases={PURCHASES}
            loadingPurchases={false}
            revenue={{ total_revenue: 12480 }}
            funnel={{ tracking: 1284, notified: 612, clicked: 241, purchased: 118, notifications_sent: 8932 }}
            customerCount={1284}
            fromWebsite={{ from_website: 312, website_clicks: 2047 }}
          />
        </div>
      </AdminFrame>
    </Canvas>
  );
}

const ITEMS = [
  { id: 1, product_name: "A Bathing Ape Bape Sta Low Crazy White", price: "325.00", size: "10M/11.5W", condition: "brand_new", image_url: IMG.bapeWhite },
  { id: 2, product_name: "Air Jordan 4 Retro OG SP Nigel Sylvester Brick by Brick", price: "850.00", size: "10M/11.5W", condition: "brand_new", image_url: IMG.j4 },
  { id: 3, product_name: "adidas Yeezy Boost 350 V2 Cream", price: "270.00", size: "10M/11.5W", condition: "pre_owned", image_url: IMG.cream },
  { id: 4, product_name: "A Bathing Ape Bape Sta Low ABC Camo Green", price: "140.00", size: "10M/11.5W", condition: "pre_owned", image_url: IMG.bapeCamo },
];

function StorefrontShot() {
  return (
    <Canvas headline="Shoppers see what's [in their size]">
      <BrowserFrame url="yourstore.syncstock.io/store/dashboard" zoom={1.3}>
        <div style={{ padding: "22px 36px" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xl font-semibold">Sneakers in your sizes</p>
              <div className="mt-2 flex gap-2">
                {["9.5M/11W", "10M/11.5W"].map((s) => (
                  <span key={s} className="rounded-full border border-border px-3 py-1 text-sm">{s}</span>
                ))}
              </div>
            </div>
            <span className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-text">+ Track a new item</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {ITEMS.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-surface overflow-hidden">
                <ProductCard item={item} />
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </Canvas>
  );
}

const ALERTS = [
  { id: "a1", product_name: "Air Jordan 4 Retro OG SP Nigel Sylvester Brick by Brick", image_url: IMG.j4, size: "10M/11.5W", active: true, category: "sneakers", condition_preference: "brand_new", max_price: "900" },
  { id: "a2", product_name: "adidas Yeezy Boost 350 V2 Cream", image_url: IMG.cream, size: "10M/11.5W", active: true, category: "sneakers", condition_preference: "either" },
  { id: "a3", product_name: "BAPE Color Camo Pullover Hoodie Red", image_url: IMG.hoodie, size: "L", active: true, category: "clothing", condition_preference: "either", max_price: "400" },
];

function AlertsShot() {
  return (
    <Canvas headline="Restock alerts the [moment] it lands">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 470px", gap: 36, alignItems: "center" }}>
        <BrowserFrame url="yourstore.syncstock.io/store/dashboard?tab=alerts" zoom={1.25}>
          <div style={{ padding: "22px 30px" }}>
            <p className="text-xl font-semibold mb-4">Your alerts</p>
            <div className="grid grid-cols-3 gap-4">
              {ALERTS.map((a) => (
                <AlertCard key={a.id} alert={a} onDelete={() => {}} onUpdated={() => {}} />
              ))}
            </div>
          </div>
        </BrowserFrame>
        {/* The restock email a shopper gets */}
        <div style={{ borderRadius: 16, background: "#fff", border: "1px solid #e4e4e7", boxShadow: "0 30px 60px -20px rgba(30,41,90,0.35)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f1f1", display: "flex", alignItems: "center", gap: 10, color: "#52525b", fontSize: 14 }}>
            <LuMail size={16} /> Your Store · just now
          </div>
          <div style={{ padding: 24, color: "#0a0a0a" }}>
            <p style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>BACK IN STOCK · YOUR SIZE</p>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 6, lineHeight: 1.2 }}>Air Jordan 4 Nigel Sylvester is back in 10M</p>
            <div style={{ marginTop: 16, background: "#fafafa", borderRadius: 12, height: 190, display: "grid", placeItems: "center" }}>
              <img src={IMG.j4} alt="" style={{ height: 160, objectFit: "contain" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 15 }}>
              <span>Size 10M/11.5W · Brand New</span>
              <strong>$850</strong>
            </div>
            <div style={{ marginTop: 16, background: "#0a0a0a", color: "#fff", borderRadius: 10, textAlign: "center", padding: "12px 0", fontWeight: 600 }}>Shop now</div>
          </div>
        </div>
      </div>
    </Canvas>
  );
}

const CARD_PREFS = { kinds: ["raw", "graded", "sealed"], min_condition: "LP", grades: { PSA: "9", BGS: "BL" }, sealed: "factory" };
const MIXED = [
  { id: 11, product_name: "2026 Pokémon Mega Evolution 30th Celebration Elite Trainer Box", price: "140.00", condition: "sealed", image_url: IMG.etb },
  { id: 12, product_name: "BAPE Color Camo Pullover Hoodie Red", price: "350.00", size: "L", condition: "brand_new", image_url: IMG.hoodie },
  { id: 13, product_name: "Fear of God Essentials Classic Tee Bright White", price: "100.00", size: "M", condition: "brand_new", image_url: IMG.tee },
];

function CategoriesShot() {
  return (
    <Canvas headline="Sneakers, apparel [and trading cards]">
      <BrowserFrame url="yourstore.syncstock.io/store/profile" zoom={1.12}>
        <div style={{ padding: "22px 30px", display: "grid", gridTemplateColumns: "400px 1fr", gap: 22, alignItems: "start" }}>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm font-semibold mb-1">Trading cards</p>
            <p className="text-xs text-text-muted mb-4">What you collect. Alerts and In stock follow these.</p>
            <CardPrefsPicker value={CARD_PREFS} onChange={() => {}} mode="profile" compact />
          </div>
          <div className="grid grid-cols-3 gap-4 content-start">
            {MIXED.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-surface overflow-hidden">
                <ProductCard item={item} />
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </Canvas>
  );
}

const SHOTS = { dashboard: [DashboardShot, "dark"], storefront: [StorefrontShot, "light"], alerts: [AlertsShot, "light"], cards: [CategoriesShot, "light"] };

export default function AppStoreShots() {
  const [params] = useSearchParams();
  const [Shot, theme] = SHOTS[params.get("shot")] || SHOTS.dashboard;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.style.margin = "0";
  }, [theme]);
  return <Shot />;
}
