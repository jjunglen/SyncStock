import { Link } from "react-router-dom";
import MarketingHeader from "../marketing/MarketingHeader.jsx";
import Footer from "../marketing/Footer.jsx";
import { LEGAL } from "../../lib/legal.js";

const PAGES = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/cookies", label: "Cookie Policy" },
];

// Shared layout for the three legal pages
export default function LegalPage({ title, current, children }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <MarketingHeader />
      <main className="px-4 pt-28 pb-20">
        <article className="mx-auto max-w-3xl">
          <nav aria-label="Legal pages" className="mb-8 flex flex-wrap gap-2 text-xs">
            {PAGES.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className={`rounded-full border px-3 py-1 transition-colors ${
                  current === p.to
                    ? "border-text/30 text-text"
                    : "border-border text-text-muted hover:text-text"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-text-muted">
            Effective {LEGAL.effectiveDate}
          </p>
          <div className="legal-prose mt-10">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
