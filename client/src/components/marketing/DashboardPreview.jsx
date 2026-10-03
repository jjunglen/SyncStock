import MerchantSidebar from "../dashboard/MerchantSidebar.jsx";
import { DashboardBody } from "../dashboard/MerchantDashboard.jsx";

// The landing page hero's picture of the merchant dashboard: the real
// sidebar and dashboard (components/dashboard), drawn with sample data so
// it always matches the product. Sample data only — a real store's
// numbers would expose its customers and revenue. It can't be clicked
// (inert) and fetches nothing.

const PREVIEW_STORE = { name: "Your Store", plan: "pro", subdomain: null };

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const SOURCING = [
  { product_key: "j4-bred", product_name: "Jordan 4 Retro Bred Reimagined", size: "10M/11.5W", demand_count: 48, currently_in_stock: false },
  { product_key: "dunk-panda", product_name: "Nike Dunk Low Retro White Black Panda", size: "9M/10.5W", demand_count: 36, currently_in_stock: true },
  { product_key: "nb-550", product_name: "New Balance 550 White Green", size: "11M/12.5W", demand_count: 27, currently_in_stock: false },
  { product_key: "j1-chicago", product_name: "Jordan 1 Retro High OG Chicago Lost and Found", size: "10.5M/12W", demand_count: 22, currently_in_stock: true },
];

const PURCHASES = [
  { id: "1", product_name: "Jordan 1 Retro High OG Chicago Lost and Found", size: "10.5M/12W", purchased_at: daysAgo(0), attribution_source: "cart_tag", price_paid: "385.00" },
  { id: "2", product_name: "adidas Yeezy Boost 350 V2 Onyx", size: "9.5M/11W", purchased_at: daysAgo(1), attribution_source: "pixel", price_paid: "240.00" },
  { id: "3", product_name: "Nike Dunk Low Grey Fog", size: "8M/9.5W", purchased_at: daysAgo(2), attribution_source: "cart_tag", price_paid: "145.00" },
  { id: "4", product_name: "Jordan 3 Retro White Cement Reimagined", size: "11M/12.5W", purchased_at: daysAgo(3), attribution_source: "cart_tag", price_paid: "260.00" },
];

// fill: the whole screen, no fade — for App Store screenshots
export default function DashboardPreview({ fill = false }) {
  return (
    <div
      role="img"
      aria-label="Preview of the Syncstock merchant dashboard with sample data"
      inert
      className={`relative flex w-full overflow-hidden text-left text-text bg-bg select-none ${
        fill ? "h-screen" : "max-h-[560px] md:max-h-[880px]"
      }`}
    >
      {/* The numbers are made up — say so (Shopify: only factual info) */}
      <span className="absolute top-3 right-3 z-20 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-text-muted">
        Sample data
      </span>
      {/* Fades out the cut-off bottom edge */}
      {!fill && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-linear-to-t from-bg to-transparent" />
      )}
      <MerchantSidebar preview={PREVIEW_STORE} />
      <div className="flex-1 min-w-0 p-4 md:p-6">
        <DashboardBody
          sourcing={SOURCING}
          loadingSourcing={false}
          productsTracked={342}
          recentPurchases={PURCHASES}
          loadingPurchases={false}
          revenue={{ total_revenue: 12480 }}
          funnel={{ alerts: 1284, notified: 8932, clicked: 2671, purchased: 214 }}
          customerCount={1284}
          fromWebsite={{ from_website: 312, website_clicks: 2047 }}
        />
      </div>
    </div>
  );
}
