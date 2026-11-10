import { Link } from "react-router-dom";
import { LuArrowRight, LuFootprints, LuShirt, LuLayers } from "react-icons/lu";
import Section from "./Section.jsx";
import { USE_CASES } from "../../lib/useCases.js";

// "Built for": the three store pages (lib/useCases.js), one click from
// the home page
const ICONS = { "/for/sneaker-stores": LuFootprints, "/for/streetwear-stores": LuShirt, "/for/trading-card-shops": LuLayers };

export default function BuiltForSection() {
  return (
    <Section id="built-for">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-center font-display text-3xl font-semibold sm:text-4xl">Built for your kind of store</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {USE_CASES.map((page) => {
            const Icon = ICONS[page.path] || LuLayers;
            return (
              <Link
                key={page.path}
                to={page.path}
                className="group flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-center transition-colors hover:border-text/30"
              >
                <Icon size={22} aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold">{page.navLabel}</h3>
                <p className="mt-1 text-sm text-text-muted">{page.h1}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  Learn more <LuArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
