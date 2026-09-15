import { Link } from "react-router-dom";
import { LuCircleCheck } from "react-icons/lu";
import Button from "../components/ui/Button.jsx";
import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import Footer from "../components/marketing/Footer.jsx";
import BlackHoleBackground from "../components/ui/BlackHoleBackground.jsx";

const PLAN = {
  name: "Pro",
  price: 40,
  info: "Everything included, for any Shopify store",
  features: [
    "Automatic Shopify sync — including your existing catalog",
    "Unlimited customer restock alerts",
    "Email, in-app, and text notifications",
    "SMS included, not a paid add-on",
    "Customer browse & search dashboard",
    "StockX-powered catalog search",
  ],
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <MarketingHeader />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <BlackHoleBackground />
        </div>

        <div className="relative z-10 max-w-lg mx-auto px-4 pt-32 pb-20 text-center">
          <h1 className="font-display text-3xl font-semibold mb-2">
            Simple, transparent pricing
          </h1>
          <p className="text-text-muted mb-10">
            One plan. No tiers to compare, no hidden fees.
          </p>

          <div className="rounded-2xl border border-border bg-surface p-8 text-left">
            <div className="mb-6">
              <div className="font-medium text-lg">{PLAN.name}</div>
              <p className="text-text-muted text-sm">{PLAN.info}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-extrabold">${PLAN.price}</span>
                <span className="text-text-muted text-sm mb-1">/month</span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {PLAN.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <LuCircleCheck
                    size={16}
                    className="text-live mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-text-muted">{feature}</p>
                </div>
              ))}
            </div>

            <Link to="/signup">
              <Button variant="primary" className="w-full">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
