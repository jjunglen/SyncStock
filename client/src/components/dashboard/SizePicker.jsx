import { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuRuler } from "react-icons/lu";
import SizeSelector from "../../pages/onboarding/SizeSelector.jsx";
import { SIZES_BY_CATEGORY } from "../../lib/categories.js";

// One or more sizes (`value` is a list), picked from a pop-out with the
// same size pills as the profile. The shopper's saved sizes are listed
// first. Stays open while picking; closes on Done, a click outside, or
// Escape.
export default function SizePicker({ value = [], onChange, mySizes = [], category = "sneakers" }) {
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

  const allSizes = SIZES_BY_CATEGORY[category] || [];
  // Shown in size-chart order
  const ordered = [...value].sort((a, b) => allSizes.indexOf(a) - allSizes.indexOf(b));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
          open ? "border-text/30 bg-surface" : "border-border bg-surface hover:border-text/20"
        }`}
      >
        <span className="flex items-center gap-2.5">
          <LuRuler size={16} className="text-text-muted" aria-hidden="true" />
          <span className="text-sm">
            {ordered.length > 0 ? (
              <>
                <span className="text-text-muted">{ordered.length === 1 ? "Size " : "Sizes "}</span>
                <span className="font-semibold text-text">{ordered.join(", ")}</span>
              </>
            ) : (
              <span className="text-text-muted">Choose one or more sizes</span>
            )}
          </span>
        </span>
        <LuChevronDown
          size={16}
          className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose sizes"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl"
        >
          <p className="text-xs text-text-muted mb-4">Pick as many sizes as you like — you'll get an alert for each.</p>
          {mySizes.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-text-muted mb-3">Your sizes</p>
              <SizeSelector selected={value} onChange={onChange} sizes={mySizes} />
            </div>
          )}
          <p className="text-xs text-text-muted mb-3">All sizes</p>
          <SizeSelector selected={value} onChange={onChange} categories={[category]} />
          <div className="sticky -bottom-4 -mx-4 -mb-4 mt-4 flex items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3">
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={value.length === 0}
              className="text-xs text-text-muted hover:text-text disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-text"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
