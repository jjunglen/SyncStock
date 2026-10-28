import { useEffect, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import SizeSelector from "../../pages/onboarding/SizeSelector.jsx";

// The Browse tab's size filter (sneakers and clothing): a dropdown-style
// button that opens the size pills, where any number of sizes can be
// ticked. It stays open while picking; closes on a click outside, Escape
// or Done. "My sizes" ticks the shopper's saved sizes in one go.
export default function SizeFilter({ value, onChange, sizes, mySizes = [] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep the picks in the size chart's order (small to large)
  const change = (next) => onChange(sizes.filter((s) => next.includes(s)));

  const label =
    value.length === 0 ? "All sizes" : value.length === 1 ? `Size ${value[0]}` : `${value.length} sizes`;
  const isMine = mySizes.length > 0 && mySizes.length === value.length && mySizes.every((s) => value.includes(s));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Size"
        className={`w-full text-left text-sm border bg-surface pl-4 pr-9 py-2.5 rounded-lg focus:outline-none cursor-pointer truncate ${
          value.length ? "text-text border-text/30" : "text-text-muted border-border"
        }`}
      >
        {label}
      </button>
      <LuChevronDown
        className={`absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-transform ${open ? "rotate-180" : ""}`}
        size={14}
        aria-hidden="true"
      />

      {open && (
        <div
          role="dialog"
          aria-label="Choose sizes"
          className="absolute left-0 top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] max-h-[26rem] overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs text-text-muted">Pick one or more sizes</p>
            <div className="flex items-center gap-3">
              {mySizes.length > 0 && !isMine && (
                <button type="button" onClick={() => change(mySizes)} className="text-xs text-text underline">
                  My sizes
                </button>
              )}
              {value.length > 0 && (
                <button type="button" onClick={() => onChange([])} className="text-xs text-text-muted hover:text-text underline">
                  Clear
                </button>
              )}
            </div>
          </div>
          <SizeSelector selected={value} onChange={change} sizes={sizes} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-lg bg-primary text-primary-text text-sm font-medium py-2.5"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
