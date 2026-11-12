import { LuCircleCheck } from "react-icons/lu";
import Button from "../components/ui/Button.jsx";
import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import Footer from "../components/marketing/Footer.jsx";
import BlackHoleBackground from "../components/ui/BlackHoleBackground.jsx";
import FAQSection from "../components/marketing/FAQSection.jsx";
import { PLAN } from "../lib/plan.js";

// Billing questions (the home page has the product ones)
const PRICING_FAQS = [
  {
    q: "How does the free trial work?",
    a: `Connect your Shopify store and you get ${PLAN.trialDays} days with everything included. Your whole catalog syncs and shoppers can sign up and set alerts during the trial. The first charge comes after it ends.`,
  },
  {
    q: "How am I billed?",
    a: `Through Shopify, on the same bill as your other apps: ${PLAN.price} a month. There's no separate card to add and no contract.`,
  },
  {
    q: "Is there a limit on alerts or products?",
    a: "No. Alerts are unlimited, and your full catalog syncs, including what you listed before installing. You don't pay more as more shoppers sign up.",
  },
  {
    q: "Do my shoppers pay anything?",
    a: "No. Shoppers sign up free on your store's SyncStock page, save their sizes and get alerts by email, push and in-app at no cost.",
  },
  {
    q: "How do I cancel?",
    a: "Uninstall SyncStock from your Shopify admin. Billing stops with it, and nothing else needs to be cancelled.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <MarketingHeader />

      <main className="relative overflow-hidden">
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
              <p className="mt-1 text-sm text-text-muted">
                {PLAN.trialDays}-day free trial · billed through Shopify
              </p>
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

            <Button to="/signup" variant="primary" className="w-full">
                Get started
              </Button>
          </div>
        </div>
        <div className="relative z-10">
          <FAQSection items={PRICING_FAQS} title="Pricing questions" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
