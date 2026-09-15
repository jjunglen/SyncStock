// src/components/marketing/LiveDemoSection.jsx
import { LuBell } from "react-icons/lu";

const DEMO_ITEMS = [
  { name: "Jordan 4 Bred", size: "10M/11.5W", price: "$225" },
  { name: "Yeezy 350 V2", size: "9.5M/11W", price: "$180" },
  { name: "Dunk Low Panda", size: "11M/12.5W", price: "$110" },
];

export default function LiveDemoSection() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <p className="text-xs text-text-muted uppercase tracking-wide mb-2 text-center">
        Example
      </p>
      <h2 className="font-display text-2xl font-semibold text-center mb-8">
        This is what your customers see
      </h2>

      <div className="rounded-2xl border border-border bg-surface p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-live" />
          <LuBell size={14} className="text-text-muted" />
          <span className="text-xs text-text-muted">Just went live</span>
        </div>
        <p className="text-sm font-medium">
          Jordan 4 Bred — size 10M/11.5W — $225
        </p>
        <p className="text-xs text-text-muted mt-1">
          Sent by email and text, instantly.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {DEMO_ITEMS.map((item) => (
          <div
            key={item.name}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            <div className="h-20 bg-surface-muted" />
            <div className="p-2.5">
              <p className="text-xs font-medium truncate">{item.name}</p>
              <p className="text-xs text-text-muted">
                {item.size} · {item.price}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
