import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LuArrowRight,
  LuBellRing,
  LuMail,
  LuMessageSquare,
  LuSmartphone,
  LuRuler,
  LuTrendingDown,
  LuSearch,
  LuLayers,
  LuChevronDown,
  LuCheck,
} from "react-icons/lu";
import Button from "../components/ui/Button.jsx";
import Glow from "../components/ui/Glow.jsx";
import SignalDot from "../components/ui/SignalDot.jsx";
import Section from "../components/marketing/Section.jsx";
import StoreHeader from "../components/store/StoreHeader.jsx";
import api from "../lib/api.js";
import { CATEGORY_META } from "../lib/categories.js";

// Shopper-facing page on a store's subdomain. Same visual language as
// the merchant landing (pages/Landing.jsx); every product shown is the
// store's real, in-stock inventory.

const FAQS = [
  {
    q: "Is it free?",
    a: "Yes, always free for shoppers. The store pays for Syncstock, not you.",
  },
  {
    q: "Do I need an account?",
    a: "Only to save your sizes and alerts, so we know where to reach you.",
  },
  {
    q: "How fast will I hear about a restock?",
    a: "Usually within seconds of it going live. Email alerts are bundled so you get one message, not ten.",
  },
  {
    q: "How do I stop alerts?",
    a: "Turn any channel off in your profile, delete an alert, or reply STOP to a text.",
  },
];

const formatPrice = (price) =>
  price ? `$${parseFloat(price).toFixed(0)}` : "";

// The hero's "live notification" — built from a real in-stock item
function NotificationCard({ item, storeName }) {
  const channels = [
    { label: "Email sent", icon: LuMail },
    { label: "Text sent", icon: LuMessageSquare },
    { label: "Push sent", icon: LuSmartphone },
  ];
  return (
    <div className="w-full max-w-md text-left rounded-xl border border-border bg-bg p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
        <span className="text-xs text-text-muted">
          Live notification · {storeName}
        </span>
      </div>
      <div className="flex gap-4">
        <div className="w-20 h-20 shrink-0 rounded-lg bg-white overflow-hidden">
          {item?.image_url && (
            <img
              src={item.image_url}
              alt=""
              className="w-full h-full object-contain p-1.5"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-muted mb-1">Back in your size</p>
          <p className="text-sm font-semibold leading-snug line-clamp-2">
            {item?.product_name || "Your next pair"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {[item?.size && `Size ${item.size}`, formatPrice(item?.price)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {channels.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-live/10 text-live text-[11px] font-medium px-2.5 py-1"
          >
            <Icon size={12} aria-hidden="true" /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function InventoryTile({ item, className = "" }) {
  return (
    <Link
      to="/store/signup"
      className={`group block overflow-hidden rounded-xl border border-border bg-linear-to-b from-card to-card-end hover:border-text/20 transition-colors ${className}`}
    >
      <div className="relative h-32 sm:h-40 bg-white">
        <img
          src={item.image_url}
          alt={item.product_name}
          loading="lazy"
          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {item.size && (
          <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            {item.size}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-medium truncate">{item.product_name}</p>
        <p className="text-sm font-semibold mt-1">{formatPrice(item.price)}</p>
      </div>
    </Link>
  );
}

export default function StoreLanding() {
  const [store, setStore] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  useEffect(() => {
    api
      .get("/store")
      .then((res) => setStore(res.data.data))
      .catch(() => {});
    api
      .get("/inventory/categories")
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {});
    api
      .get("/inventory?limit=16")
      .then((res) => setInventory(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingInventory(false));
  }, []);

  const storeName = store?.name || "This store";
  const carried = categories
    .map((c) => CATEGORY_META[c.key]?.label)
    .filter(Boolean);
  const featured = inventory.find((i) => i.size) || inventory[0];
  const strip = inventory.slice(0, 12);
  const recent = inventory.slice(0, 8);

  const features = [
    {
      title: "Size alerts for anything in stock",
      description: `Turn on size alerts and hear about any new arrival in your size at ${storeName} — not just the ones you're tracking.`,
      icon: LuRuler,
    },
    {
      title: "Price-drop alerts",
      description: "Get notified when something you're tracking gets cheaper.",
      icon: LuTrendingDown,
    },
    {
      title: "Search what's in stock",
      description: "Browse and search the whole store by name, SKU, or size.",
      icon: LuSearch,
    },
    {
      title: carried.length > 1 ? carried.join(" · ") : "Every drop, one place",
      description:
        carried.length > 1
          ? "Switch between categories and filter by the sizes that fit you."
          : "Your saved sizes filter everything down to what actually fits.",
      icon: LuLayers,
    },
  ];

  return (
    <div className="relative min-h-screen bg-bg text-text">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="layout-lines mx-auto h-full max-w-6xl" />
      </div>

      <StoreHeader storeName={store?.name} />

      <main className="relative">
        {/* Hero */}
        <section className="fade-bottom line-b overflow-hidden px-4 pb-0">
          <div className="max-w-6xl mx-auto flex flex-col items-center gap-6 sm:gap-10 pt-28 sm:pt-36 text-center">
            <span className="animate-appear inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-text-muted">
              <SignalDot tone="live" size="sm" /> Real-time restock alerts
            </span>
            <h1 className="animate-appear font-display relative z-10 max-w-4xl bg-linear-to-r from-text to-text-muted bg-clip-text text-4xl leading-tight font-semibold text-balance text-transparent sm:text-6xl sm:leading-tight">
              Never miss your size at {storeName}
            </h1>
            <p className="animate-appear opacity-0 [animation-delay:100ms] relative z-10 max-w-2xl text-base sm:text-xl font-medium text-text-muted text-balance">
              Save your sizes, pick what you want, and we'll tell you the
              moment it's back — by email, text, or push.
            </p>
            <div className="animate-appear opacity-0 [animation-delay:300ms] relative z-10 flex flex-wrap justify-center gap-3">
              <Link to="/store/signup">
                <Button variant="primary" size="lg">
                  Create your alerts
                </Button>
              </Link>
              <Link to="/store/dashboard?tab=browse">
                <Button variant="secondary" size="lg">
                  Browse inventory
                </Button>
              </Link>
            </div>

            <div className="relative w-full pt-8 sm:pt-12 pb-16 sm:pb-24">
              <div className="animate-appear opacity-0 [animation-delay:700ms] relative z-10 mx-auto flex w-fit max-w-full rounded-2xl bg-border/50 p-2">
                <NotificationCard item={featured} storeName={storeName} />
              </div>
              <Glow
                variant="top"
                className="animate-appear-zoom opacity-0 [animation-delay:1000ms]"
              />
            </div>
          </div>
        </section>

        {/* Live inventory strip */}
        {strip.length > 0 && (
          <section className="line-b py-10 overflow-hidden">
            <p className="text-xs text-text-muted uppercase tracking-widest text-center mb-6">
              Live inventory
            </p>
            <div className="fade-x flex w-max animate-marquee gap-4">
              {[...strip, ...strip].map((item, i) => (
                <InventoryTile
                  key={`${item.id}-${i}`}
                  item={item}
                  className="w-40 sm:w-48 shrink-0"
                />
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <Section id="how-it-works">
          <div className="max-w-6xl mx-auto flex flex-col items-center gap-10 sm:gap-16">
            <div className="text-center">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-4">
                How it works
              </p>
              <h2 className="font-display max-w-2xl text-3xl leading-tight font-semibold sm:text-5xl sm:leading-tight">
                Everything you need to never miss a drop
              </h2>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2 md:row-span-2 flex flex-col justify-between gap-6 rounded-xl border border-border bg-linear-to-b from-card to-card-end p-6">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-text/5 border border-border flex items-center justify-center mb-4">
                    <LuBellRing size={20} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg md:text-2xl font-semibold mb-2">
                    Instant alerts when your size drops
                  </h3>
                  <p className="text-sm md:text-base text-text-muted leading-relaxed">
                    The moment something you're tracking hits {storeName}'s
                    inventory in your size, you hear about it — before anyone
                    else has a chance to buy.
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-sm">
                  {["Email", "Text message", "Push notification", "In-app inbox"].map((c) => (
                    <li key={c} className="flex items-center gap-2 text-text-muted">
                      <LuCheck size={16} className="text-live shrink-0" aria-hidden="true" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
              {features.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border bg-linear-to-b from-card to-card-end p-5"
                >
                  <div className="w-9 h-9 rounded-lg bg-text/5 border border-border flex items-center justify-center mb-3">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-text-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Recent drops — real inventory */}
        <Section>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-4">
                Recent drops
              </p>
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                What's in {storeName} right now
              </h2>
            </div>
            {loadingInventory ? (
              <p className="text-sm text-text-muted text-center">Loading...</p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-text-muted text-center">
                Nothing in stock yet — sign up and we'll tell you when it lands.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recent.map((item) => (
                  <InventoryTile key={item.id} item={item} />
                ))}
              </div>
            )}
            <div className="mt-8 text-center">
              <Link
                to="/store/dashboard?tab=browse"
                className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
              >
                Browse everything <LuArrowRight size={14} />
              </Link>
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section>
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
            <h2 className="font-display text-center text-3xl font-semibold sm:text-4xl">
              Questions and answers
            </h2>
            <div className="w-full max-w-3xl divide-y divide-border border-y border-border">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group py-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-left font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <LuChevronDown
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-text-muted transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="pb-4 text-text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        {/* CTA */}
        <section className="group relative overflow-hidden px-4 py-24">
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
            <h2 className="font-display text-3xl sm:text-5xl font-semibold">
              Ready to stop missing drops?
            </h2>
            <p className="text-text-muted">
              Join {storeName} and never miss your size again.
            </p>
            <Link to="/store/signup">
              <Button variant="primary" size="lg">
                Get started free
              </Button>
            </Link>
          </div>
          <div className="absolute inset-0 opacity-80 transition-all duration-500 ease-in-out group-hover:-translate-y-8 group-hover:opacity-100">
            <Glow variant="bottom" />
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} {storeName} · Powered by Syncstock
          </p>
          <nav className="flex gap-4 text-xs text-text-muted">
            <a href="/privacy" className="hover:text-text transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-text transition-colors">Terms</a>
            <a href="/cookies" className="hover:text-text transition-colors">Cookies</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
