import { useRef, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import NumberFlow from "@number-flow/react";
import { LuX } from "react-icons/lu";
import Button from "./Button.jsx";
import { PRICE_MIN, PRICE_MAX } from "../../lib/priceRange.js";

// Two-handle price range, adapted from the "Slider 06" design (radix
// slider + animated numbers) to this app's colors and components.
// value: [low, high] (see lib/priceRange.js). The top of the scale means
// "no maximum" and shows as "$1,000+"; the bottom means "no minimum".
// Prices can be dragged or typed (Min / Max boxes). Hovering outside the
// selected range previews where a handle would land.
const STEP = 10;
const LABELS = [0, 250, 500, 750, 1000];

const clampToStep = (v) => Math.max(PRICE_MIN, Math.min(PRICE_MAX, Math.round(v / STEP) * STEP));
const toPct = (v) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

// A typed price: digits only, whole dollars. Empty means "no limit".
const parsePrice = (text) => {
  const digits = String(text).replace(/[^0-9]/g, "");
  return digits === "" ? null : Number(digits);
};

// Min / Max boxes for typing an exact price instead of dragging. While
// typing, the box shows what's typed; the slider follows each valid
// number. Leaving the box tidies it (swaps if min > max, etc.).
function PriceInput({ label, value, placeholder, onType, onDone }) {
  const [text, setText] = useState(null); // null = not being edited
  const shown = text ?? (value === null ? "" : String(value));
  return (
    <label className="flex-1 min-w-0">
      <span className="block text-[11px] font-medium text-text-muted mb-1">{label}</span>
      <span className="flex items-center rounded-lg border border-border bg-surface-muted focus-within:border-text/30 focus-within:ring-2 focus-within:ring-primary/20">
        <span className="pl-3 text-sm text-text-muted" aria-hidden="true">$</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={shown}
          placeholder={placeholder}
          aria-label={`${label} price`}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9]/g, "").slice(0, 5);
            setText(cleaned);
            onType(parsePrice(cleaned));
          }}
          onBlur={() => {
            setText(null);
            onDone();
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-full min-w-0 bg-transparent px-1.5 py-2 text-sm tabular-nums text-text placeholder:text-text-muted focus:outline-none"
        />
      </span>
    </label>
  );
}

export default function PriceRangeSlider({ value, onChange, label = "Price range" }) {
  const [preview, setPreview] = useState(null);
  const rootRef = useRef(null);
  const [low, high] = value;
  const isDefault = low === PRICE_MIN && high === PRICE_MAX;

  const handleMouseMove = (e) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPreview(clampToStep(((e.clientX - rect.left) / rect.width) * (PRICE_MAX - PRICE_MIN) + PRICE_MIN));
  };

  const lowPct = toPct(low);
  const highPct = toPct(high);
  const previewPct = preview !== null ? toPct(preview) : null;
  let ghostLeft = 0;
  let ghostWidth = 0;
  if (previewPct !== null && previewPct < lowPct) {
    ghostLeft = previewPct;
    ghostWidth = lowPct - previewPct;
  } else if (previewPct !== null && previewPct > highPct) {
    ghostLeft = highPct;
    ghostWidth = previewPct - highPct;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums text-text">
              $<NumberFlow value={low} />
            </span>
            <span className="text-text-muted">–</span>
            <span className="text-xl font-bold tabular-nums text-text">
              $<NumberFlow value={high} />
              {high === PRICE_MAX && "+"}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={() => onChange([PRICE_MIN, PRICE_MAX])}
          disabled={isDefault}
          prefix={<LuX size={12} aria-hidden="true" />}
        >
          Clear
        </Button>
      </div>

      {/* Type an exact price instead of dragging */}
      <div className="flex items-end gap-2">
        <PriceInput
          label="Min"
          value={low > PRICE_MIN ? low : null}
          placeholder="0"
          onType={(n) => onChange([Math.min(n ?? PRICE_MIN, PRICE_MAX), high])}
          onDone={() => low > high && onChange([high, low])}
        />
        <span className="pb-2.5 text-text-muted" aria-hidden="true">–</span>
        <PriceInput
          label="Max"
          value={high < PRICE_MAX ? high : null}
          placeholder="No max"
          onType={(n) => onChange([low, n === null || n >= PRICE_MAX ? PRICE_MAX : n])}
          onDone={() => low > high && onChange([high, low])}
        />
      </div>

      <div className="space-y-2">
        <div
          ref={rootRef}
          className="relative w-full py-1.5"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setPreview(null)}
        >
          <SliderPrimitive.Root
            // In order even mid-typing (e.g. Max briefly below Min)
            value={[Math.min(low, high), Math.max(low, high)]}
            onValueChange={onChange}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={STEP}
            minStepsBetweenThumbs={1}
            className="relative flex w-full touch-none select-none items-center"
          >
            <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-text/10">
              <SliderPrimitive.Range className="absolute h-full bg-primary" />
            </SliderPrimitive.Track>
            {["Minimum price", "Maximum price"].map((name) => (
              <SliderPrimitive.Thumb
                key={name}
                aria-label={name}
                className="relative z-[2] block size-5 rounded-full border-2 border-primary bg-bg shadow-md transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-grab active:cursor-grabbing"
              />
            ))}
          </SliderPrimitive.Root>

          {ghostWidth > 0 && (
            <div
              className="pointer-events-none absolute top-1/2 z-[1] h-2 -translate-y-1/2 rounded-full bg-primary/30 transition-[left,width] duration-75"
              style={{ left: `${ghostLeft}%`, width: `${ghostWidth}%` }}
            />
          )}
        </div>

        <div className="flex justify-between text-[11px] font-medium text-text-muted/70 select-none">
          {LABELS.map((v) => (
            <span key={v}>
              ${v.toLocaleString()}
              {v === PRICE_MAX && "+"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
