import { Link } from "react-router-dom";
import { LuCircleCheck } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Section from "./Section.jsx";
import { PLAN } from "../../lib/plan.js";

// Adapted from Launch UI's pricing column (MIT — see LAUNCH_UI_LICENSE.md)
export default function PricingSection() {
  return (
    <Section id="pricing">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-4 px-4 text-center sm:gap-8">
          <h2 className="font-display text-3xl leading-tight font-semibold sm:text-5xl sm:leading-tight">
            One plan. Everything included.
          </h2>
          <p className="max-w-xl text-base font-medium text-text-muted sm:text-xl">
            No tiers, no per-alert fees, and texts aren't a paid add-on.
          </p>
        </div>

        <div className="relative flex w-full max-w-md flex-col gap-6 overflow-hidden rounded-2xl border border-border bg-linear-to-b from-surface to-bg p-8 shadow-xl">
          <hr className="absolute top-0 left-[10%] h-px w-[80%] border-0 bg-linear-to-r from-transparent via-text/60 to-transparent" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/2 h-32 w-full -translate-x-1/2 rounded-[50%] bg-text/20 blur-[72px]"
          />
          <header className="relative flex flex-col gap-2">
            <h3 className="font-bold">{PLAN.name}</h3>
            <p className="text-sm text-text-muted">{PLAN.info}</p>
          </header>
          <div className="relative flex items-baseline gap-1">
            <span className="text-2xl font-bold text-text-muted">$</span>
            <span className="text-6xl font-bold">{PLAN.price}</span>
            <span className="text-sm text-text-muted">/month</span>
          </div>
          <Link to="/onboarding" className="relative">
            <Button variant="primary" size="lg" className="w-full">
              Connect your Shopify store
            </Button>
          </Link>
          <hr className="border-border" />
          <ul className="relative flex flex-col gap-2">
            {PLAN.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <LuCircleCheck size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
