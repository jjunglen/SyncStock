import { Link, useLocation } from "react-router-dom";
import { LuArrowRight, LuCheck } from "react-icons/lu";
import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import Footer from "../components/marketing/Footer.jsx";
import Section from "../components/marketing/Section.jsx";
import MockAlertDemo from "../components/marketing/MockAlertDemo.jsx";
import Button from "../components/ui/Button.jsx";
import BetaBadge from "../components/ui/BetaBadge.jsx";
import { USE_CASES, useCaseFor } from "../lib/useCases.js";
import NotFound from "./NotFound.jsx";

// A "Built for" page (/for/sneaker-stores …), from lib/useCases.js. Title
// and description come from components/Seo.jsx.
export default function UseCasePage() {
  const { pathname } = useLocation();
  const page = useCaseFor(pathname.replace(/\/+$/, ""));
  if (!page) return <NotFound />;
  const others = USE_CASES.filter((p) => p.path !== page.path);

  // Google's FAQ format, from the same questions shown on the page
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <div className="relative min-h-screen bg-bg text-text">
      <MarketingHeader />
      <main className="relative">
        <section className="line-b px-4 pt-32 pb-16 sm:pt-40 sm:pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <p className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              {page.eyebrow} {page.beta && <BetaBadge size="xs" className="normal-case tracking-normal" />}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold sm:text-6xl text-balance">{page.h1}</h1>
            <p className="mt-5 text-base sm:text-xl text-text-muted text-balance">{page.intro}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button to="/onboarding" variant="primary" size="lg">Connect your Shopify store</Button>
              <Button to="/pricing" variant="secondary" size="lg">See pricing</Button>
            </div>
          </div>
        </section>

        {/* Try it: a working demo of the alert rules for this kind of store */}
        <Section id="try-it">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-center">Try it: set an alert</h2>
            <p className="mt-3 mb-10 text-center text-text-muted">Pick what you'd want, then simulate a restock and see whether the alert goes out.</p>
            <MockAlertDemo key={page.demo} kind={page.demo} />
          </div>
        </Section>

        <Section>
          <div className="max-w-5xl mx-auto grid gap-8 sm:grid-cols-2">
            {page.points.map((p) => (
              <div key={p.title} className="rounded-xl border border-border bg-surface p-6">
                <h2 className="text-lg font-semibold">{p.title}</h2>
                <p className="mt-2 text-sm text-text-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-center">How it works</h2>
            <ol className="mt-8 space-y-4">
              {page.steps.map((step, i) => (
                <li key={step} className="flex gap-4 rounded-xl border border-border bg-surface p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-text">
                    {i + 1}
                  </span>
                  <p className="text-sm sm:text-base pt-1">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-center">Questions</h2>
            <dl className="mt-8 divide-y divide-border border-y border-border">
              {page.faq.map(({ q, a }) => (
                <div key={q} className="py-5">
                  <dt className="flex items-start gap-2 font-medium">
                    <LuCheck size={18} className="mt-0.5 shrink-0 text-live" aria-hidden="true" /> {q}
                  </dt>
                  <dd className="mt-2 pl-7 text-sm text-text-muted">{a}</dd>
                </div>
              ))}
            </dl>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
          </div>
        </Section>

        <Section>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-2xl font-semibold">Also built for</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {others.map((p) => (
                <Link
                  key={p.path}
                  to={p.path}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-text/5"
                >
                  {p.navLabel} <LuArrowRight size={14} aria-hidden="true" />
                </Link>
              ))}
              <Link to="/stores" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-text/5">
                See joined stores <LuArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
