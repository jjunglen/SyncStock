import { Link } from "react-router-dom";
import { LuArrowRight } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Glow from "../ui/Glow.jsx";
import DashboardPreview from "./DashboardPreview.jsx";

// Layout adapted from Launch UI's hero (MIT — see LAUNCH_UI_LICENSE.md)
export default function HeroSection() {
  return (
    <section className="fade-bottom line-b overflow-hidden px-4 pb-0">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-6 sm:gap-10 pt-24 sm:pt-32 text-center">
        <Link
          to="/onboarding"
          className="animate-appear inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs"
        >
          <span className="text-text-muted">
            Now syncing sneakers, clothing, and trading cards
          </span>
          <span className="flex items-center gap-1 font-medium">
            Get started <LuArrowRight size={12} />
          </span>
        </Link>

        <h1 className="animate-appear font-display relative z-10 max-w-4xl bg-linear-to-r from-text to-text-muted bg-clip-text text-4xl leading-tight font-semibold text-balance text-transparent sm:text-6xl sm:leading-tight md:text-7xl md:leading-tight">
          Turn every restock into a sale
        </h1>

        <p className="animate-appear opacity-0 [animation-delay:100ms] relative z-10 max-w-2xl text-base sm:text-xl font-medium text-text-muted text-balance">
          Connect your Shopify store in minutes. Shoppers pick their sizes,
          and Syncstock alerts them by email, text, and push the moment it's
          back — then shows you exactly which alerts turned into sales.
        </p>

        <div className="animate-appear opacity-0 [animation-delay:300ms] relative z-10 flex flex-wrap justify-center gap-3">
          <Link to="/onboarding">
            <Button variant="primary" size="lg">
              Connect your Shopify store
            </Button>
          </Link>
          <a href="#features">
            <Button variant="secondary" size="lg">
              See how it works
            </Button>
          </a>
        </div>

        <div className="relative w-full pt-8 sm:pt-12">
          <div className="animate-appear opacity-0 [animation-delay:700ms] relative z-10 flex overflow-hidden rounded-2xl bg-border/50 p-2">
            <div className="relative z-10 flex w-full overflow-hidden rounded-xl border border-border shadow-2xl">
              <DashboardPreview />
            </div>
          </div>
          <Glow
            variant="top"
            className="animate-appear-zoom opacity-0 [animation-delay:1000ms]"
          />
        </div>
      </div>
    </section>
  );
}
