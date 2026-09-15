import { useEffect, useRef } from "react";
import {
LuBellRing,
LuSearch,
LuUsers,
LuTrendingUp,
LuMessageSquare,
} from "react-icons/lu";

function BentoItem({ className = "", children }) {
const itemRef = useRef(null);

useEffect(() => {
    const item = itemRef.current;
    if (!item) return;
    const handleMouseMove = (e) => {
    const rect = item.getBoundingClientRect();
    item.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    item.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    };
    item.addEventListener("mousemove", handleMouseMove);
    return () => item.removeEventListener("mousemove", handleMouseMove);
}, []);

return (
    <div
    ref={itemRef}
    className={`relative rounded-xl border border-border bg-surface p-5 overflow-hidden transition-colors hover:border-white/20 ${className}`}
    style={{
        background:
        "radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.04) 0%, transparent 60%), var(--color-surface)",
    }}
    >
    {children}
    </div>
);
}

export default function HowItWorksGrid() {
return (
    <div className="w-full">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Large card */}
        <BentoItem className="md:col-span-2 md:row-span-2">
        <div className="flex flex-col h-full justify-between gap-6">
            <div>
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-border flex items-center justify-center mb-4">
                <LuBellRing className="text-text" size={20} />
            </div>
            <h2 className="text-lg md:text-2xl font-bold mb-2">
                Instant alerts when a shoe drops
            </h2>
            <p className="text-text-muted text-sm md:text-base leading-relaxed">
                The moment a shoe hits your store's inventory in a customer's
                size, they're notified instantly by email, in-app, and text —
                before anyone else has a chance to buy.
            </p>
            </div>
            <div className="bg-bg rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-live animate-pulse" />
                <span className="text-xs text-text-muted">
                Live notification
                </span>
            </div>
            <p className="text-sm text-text font-medium">
                Jordan 4 Retro Bred Reimagined
            </p>
            <p className="text-xs text-text-muted mt-1">
                Size 10M/11.5W · $215 · Brand New
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-surface-muted text-text-muted border border-border px-2 py-1 rounded-full">
                Email sent
                </span>
                <span className="text-xs bg-surface-muted text-text-muted border border-border px-2 py-1 rounded-full">
                Text sent
                </span>
                <span className="text-xs bg-surface-muted text-text-muted border border-border px-2 py-1 rounded-full">
                In-app
                </span>
            </div>
            </div>
        </div>
        </BentoItem>

        <BentoItem>
        <div className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center mb-3">
            <LuSearch className="text-text" size={18} />
        </div>
        <h2 className="text-base font-bold mb-1">Search any shoe</h2>
        <p className="text-text-muted text-sm">
            Search by name or SKU from the full StockX catalog.
        </p>
        </BentoItem>

        <BentoItem>
        <div className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center mb-3">
            <LuUsers className="text-text" size={18} />
        </div>
        <h2 className="text-base font-bold mb-1">No signup friction for returning shoppers</h2>
        <p className="text-text-muted text-sm">
            If a customer already has a Syncstock account, they can start setting alerts on your store instantly — no new signup required.
        </p>
        </BentoItem>

        <BentoItem className="md:col-span-2 col-span-1">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center shrink-0 mt-0.5">
            <LuTrendingUp className="text-text" size={18} />
            </div>
            <div>
            <h2 className="text-base font-bold mb-1">
                Size alerts for anything in stock
            </h2>
            <p className="text-text-muted text-sm">
                Turn on size alerts and get notified whenever any shoe in your
                size hits the store — not just the ones you're tracking.
            </p>
            </div>
        </div>
        </BentoItem>

        <BentoItem>
        <div className="w-9 h-9 rounded-lg bg-white/5 border border-border flex items-center justify-center mb-3">
            <LuMessageSquare className="text-text" size={18} />
        </div>
        <h2 className="text-base font-bold mb-1">Text alerts included</h2>
        <p className="text-text-muted text-sm">
            SMS notifications are bundled in, not a paid add-on. Verify your
            number once, get texted the moment your size drops.
        </p>
        </BentoItem>
    </div>
    </div>
);
}
