import { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuRuler } from "react-icons/lu";
import SizeSelector from "../../pages/onboarding/SizeSelector.jsx";

// One size, picked from a pop-out with the same size pills as the
// profile. The shopper's saved sizes are listed first. Closes on a pick,
// a click outside, or Escape.
export default function SizePicker({ value, onChange, mySizes = [], category = "sneakers" }) {
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

  // The pills are multi-select; here the newest pick replaces the old one
  const pick = (next) => {
    const added = next.find((s) => s !== value);
    onChange(added || null);
    if (added) setOpen(false);
  };

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
            {value ? (
              <>
                <span className="text-text-muted">Size </span>
                <span className="font-semibold text-text">{value}</span>
              </>
            ) : (
              <span className="text-text-muted">Choose your size</span>
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
          aria-label="Choose a size"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-xl"
        >
          {mySizes.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-text-muted mb-3">Your sizes</p>
              <SizeSelector selected={value ? [value] : []} onChange={pick} sizes={mySizes} />
            </div>
          )}
          <p className="text-xs text-text-muted mb-3">All sizes</p>
          <SizeSelector selected={value ? [value] : []} onChange={pick} categories={[category]} />
        </div>
      )}
    </div>
  );
}
