import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LuSearch, LuRuler, LuBell, LuChevronDown } from "react-icons/lu";
import Button from "../components/ui/Button.jsx";
import Glow from "../components/ui/Glow.jsx";
import ScrollReveal from "../components/ui/ScrollReveal.jsx";
import SignalDot from "../components/ui/SignalDot.jsx";
import api from "../lib/api.js";

const STEPS = [
  { icon: LuSearch, label: "Search", desc: "Find the shoe you want" },
  { icon: LuRuler, label: "Set your size", desc: "And your max price" },
  { icon: LuBell, label: "Get notified", desc: "Email or text, instantly" },
];

const FAQS = [
  {
    q: "Do I need an account?",
    a: "Just to save alerts — browsing is completely free, no signup required.",
  },
  {
    q: "Is this free?",
    a: "Yes, always free for shoppers. Merchants pay for the platform, not you.",
  },
  {
    q: "How fast will I hear back?",
    a: "The moment your size goes live in stock — usually within seconds.",
  },
];

export default function StoreLanding() {
  const [store, setStore] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    api
      .get("/store")
      .then((res) => setStore(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get("/inventory?limit=6")
      .then((res) => setInventory(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingInventory(false));
  }, []);

  const storeName = store?.name || "This store";

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Lightweight header — store identity, not the marketing site's nav */}
      <header className="fixed top-0 left-0 w-full z-40 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SignalDot tone="live" size="md" />
            <div>
              <span className="font-display font-semibold text-sm">
                {storeName}
              </span>
              <span className="block text-[10px] text-text-muted -mt-0.5">
                Powered by Syncstock
              </span>
            </div>
          </div>
          <Link to="/store/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <div className="pt-16">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 pointer-events-none opacity-40">
            <Glow variant="top" />
          </div>
          <div className="max-w-lg mx-auto px-4 pt-20 pb-16 text-center">
            <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight mb-4">
              Never miss a restock at {storeName}
            </h1>
            <p className="text-text-muted mb-8">
              Get notified the instant your size comes back — free, one click.
            </p>
            <Link to="/store/signup">
              <Button variant="primary" size="lg">
                Set up alerts
              </Button>
            </Link>
          </div>
        </div>

        {/* Manifesto — short, honest statement, no fabricated stats */}
        <ScrollReveal>
          <div className="max-w-xl mx-auto px-4 py-12 text-center">
            <p className="text-lg text-text-muted leading-relaxed">
              Restocks sell out in seconds. You shouldn't have to refresh a page
              all day hoping to catch one — we'll tell you the moment it's live.
            </p>
          </div>
        </ScrollReveal>

        {/* 3-step walkthrough */}
        <ScrollReveal>
          <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="text-center">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Icon size={20} className="text-text" />
                    </div>
                    <p className="font-medium text-sm mb-1">{step.label}</p>
                    <p className="text-xs text-text-muted">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Real, live inventory — not placeholder blocks */}
        <ScrollReveal>
          <div className="max-w-3xl mx-auto px-4 py-12">
            <p className="text-xs text-text-muted uppercase tracking-wide mb-4 text-center">
              In stock right now
            </p>
            {loadingInventory ? (
              <p className="text-sm text-text-muted text-center">Loading...</p>
            ) : inventory.length === 0 ? (
              <p className="text-sm text-text-muted text-center">
                Nothing in stock yet — check back soon.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-surface border border-border rounded-xl overflow-hidden"
                  >
                    <div className="h-24 bg-surface-muted flex items-center justify-center">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-muted" />
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-medium truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {item.size} · ${item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* FAQ — real, honest, no fabricated content needed */}
        <ScrollReveal>
          <div className="max-w-xl mx-auto px-4 py-12">
            <h2 className="font-display text-xl font-semibold text-center mb-6">
              Questions
            </h2>
            <div className="space-y-2">
              {FAQS.map((faq, idx) => (
                <div
                  key={faq.q}
                  className="border border-border rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium">{faq.q}</span>
                    <LuChevronDown
                      size={16}
                      className={`text-text-muted transition-transform ${openFaq === idx ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === idx && (
                    <p className="px-4 pb-3 text-sm text-text-muted">{faq.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal>
          <div className="text-center py-16 border-t border-border">
            <p className="font-display text-lg font-semibold mb-4">
              Set your first alert
            </p>
            <Link to="/store/signup">
              <Button variant="primary" size="lg">
                Get started
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </div>

      <footer className="border-t border-border">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-text-muted">© {storeName}</p>
            <p className="text-xs text-text-muted">Powered by Syncstock</p>
          </div>
          <div className="flex gap-4 text-xs text-text-muted">
            <a href="#" className="hover:text-text transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-text transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
