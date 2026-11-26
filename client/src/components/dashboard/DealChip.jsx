import { useEffect, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";

// "Good deal": the store's price against the market for that shoe, from
// the server (services/dealBadge.service.js sets item.deal when the price
// is within 10% of it, or under it):
//   source "stockx" → brand new, against StockX
//   source "sales"  → pre-owned, against the store's own used sales
// DealChip sits above the name on a product card; a tap opens a small
// dropdown with both prices, opening upward over the photo across the
// card (the card's text area is its anchor: position relative; cards clip
// what hangs below them); it never opens the product.
// DealCompare is the same comparison in the product pop-out.

const marketLabel = (deal) => (deal.source === "stockx" ? "StockX" : `Avg of ${deal.sales} used sales`);

const savingsLine = (price, deal) => {
  const diff = Math.round(deal.market - price);
  const against = deal.source === "stockx" ? "StockX" : "what it sells for used";
  if (diff > 0) return `$${diff} under ${against}. You save $${diff}.`;
  if (diff === 0) return `Same price as ${against}.`;
  return `Within 10% of ${against}.`;
};

// The fire flickers only while it's on screen (one shared observer), so a
// long list of deals doesn't keep dozens of animations running
let fireObserver = null;
const watchFire = (el) => {
  if (typeof IntersectionObserver === "undefined") {
    el.classList.add("on");
    return () => {};
  }
  fireObserver ||= new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle("on", e.isIntersecting);
  });
  fireObserver.observe(el);
  return () => fireObserver.unobserve(el);
};

function Fire({ className = "" }) {
  const ref = useRef(null);
  useEffect(() => (ref.current ? watchFire(ref.current) : undefined), []);
  return (
    <span ref={ref} className={`fire-flicker ${className}`} aria-hidden="true">
      🔥
    </span>
  );
}

export function DealChip({ item, compact = false, large = false, light = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const deal = item.deal;

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (!deal) return null;
  const price = Number(item.price);

  return (
    <div ref={ref} className="mb-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className={`deal-chip ${light ? "deal-chip-light" : ""} inline-flex items-center gap-1 rounded-full font-medium ${large ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-[11px]"}`}
      >
        <Fire />
        {compact ? "Deal" : "Good deal"}
        <LuChevronDown size={large ? 14 : 11} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="animate-appear absolute inset-x-2 bottom-full z-20 mb-1 max-w-xs rounded-lg border border-border bg-surface p-3 text-xs text-text shadow-lg">
          <div className="flex justify-between gap-3 py-0.5">
            <span>This store</span>
            <span className="font-semibold">${Math.round(price)}</span>
          </div>
          <div className="flex justify-between gap-3 py-0.5 text-text-muted">
            <span>{marketLabel(deal)}</span>
            <span>${deal.market}</span>
          </div>
          <p className="deal-text mt-1.5 border-t border-border pt-1.5">{savingsLine(price, deal)}</p>
        </div>
      )}
    </div>
  );
}

export function DealCompare({ item }) {
  const deal = item.deal;
  if (!deal) return null;
  const price = Number(item.price);
  return (
    <div className="mb-5 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm">
      <div className="flex justify-between gap-3 py-0.5">
        <span>This store</span>
        <span className="font-semibold">${Math.round(price)}</span>
      </div>
      <div className="flex justify-between gap-3 py-0.5 text-text-muted">
        <span>{marketLabel(deal)}</span>
        <span className={deal.market > price ? "line-through" : ""}>${deal.market}</span>
      </div>
      <div className="deal-chip mt-2 flex items-center gap-2 rounded-lg px-3 py-2">
        <Fire className="text-lg" />
        <span>{savingsLine(price, deal)}</span>
      </div>
    </div>
  );
}
