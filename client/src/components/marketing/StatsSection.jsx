import Section from "./Section.jsx";
import { PLAN } from "../../lib/plan.js";

// Adapted from Launch UI's stats row (MIT — see LAUNCH_UI_LICENSE.md).
// Product facts, not usage claims — keep them matching the code:
// QUICK_FLUSH_DELAY_MS (digest.service.js), ATTRIBUTION_WINDOW_DAYS
// (webhook.controller.js), the email/SMS/push channels, and lib/plan.js.
const STATS = [
  { label: "alerts go out in", value: "30", suffix: "sec", description: "from the moment an item restocks" },
  { label: "reach shoppers on", value: "3", suffix: "channels", description: "email, text, and push, all included" },
  { label: "sales tracked for", value: "30", suffix: "days", description: "after a shopper sets an alert" },
  { label: "one plan,", value: `$${PLAN.price}`, suffix: "/mo", description: "every feature and SMS included" },
];

export default function StatsSection() {
  return (
    <Section>
      <div className="mx-auto max-w-5xl grid grid-cols-2 gap-12 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col items-start gap-3 text-left">
            <p className="text-sm font-semibold text-text-muted">{s.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display bg-linear-to-r from-text to-text-muted bg-clip-text text-4xl font-medium text-transparent sm:text-5xl md:text-6xl">
                {s.value}
              </span>
              <span className="text-xl font-semibold text-live">{s.suffix}</span>
            </div>
            <p className="text-sm font-semibold text-text-muted text-pretty">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
