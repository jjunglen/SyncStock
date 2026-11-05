import { useState } from "react";
import { LuPlus, LuCircleCheck } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import api from "../../lib/api.js";

// Track → "Don't see it? Track by name": an alert for anything in the
// store's "other" category whose name has these words ("burton custom"),
// in sizes from the store's size chart — or any size. Covers next year's
// model and items the store hasn't stocked yet (alert.service.js matches
// name alerts).
//   query — what the shopper searched
//   other — { name, sizes, size_label } from /inventory/categories
export default function TrackByName({ query, other }) {
  const [picked, setPicked] = useState([]);
  const [maxPrice, setMaxPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const words = query.replace(/\s+/g, " ").trim();
  const sizes = other.sizes || [];
  const categoryName = other.name || "Other";

  const toggle = (size) => setPicked((list) => (list.includes(size) ? list.filter((s) => s !== size) : [...list, size]));

  const submit = async () => {
    const price = maxPrice.trim();
    if (price && !/^\d+(\.\d{1,2})?$/.test(price)) {
      setError("Enter a max price like 700");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/alerts", {
        category: "other",
        match: "keywords",
        product_name: words,
        sizes: picked,
        ...(price && { max_price: price }),
        notify_email: true,
        notify_inapp: true,
      });
      const made = (res.data.created || []).filter(Boolean);
      setDone(
        made.length
          ? `You'll hear when "${words}" arrives in ${made.join(", ")}.`
          : `You'll hear when "${words}" arrives in any size.`,
      );
      setPicked([]);
      setMaxPrice("");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't set that alert. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (words.length < 2) return null;

  return (
    <div className="mt-5 rounded-xl border border-dashed border-text/25 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <LuPlus size={16} aria-hidden="true" /> Don't see it? Track by name
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Get an alert when anything in {categoryName} named “{words}” arrives
        {sizes.length ? " in the sizes you pick" : ""}.
      </p>

      {sizes.length > 0 && (
        <div className="mt-3">
          {other.size_label && <p className="mb-2 text-xs text-text-muted">{other.size_label}</p>}
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const on = picked.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggle(size)}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    on ? "border-primary bg-primary text-primary-text" : "border-border text-text-muted hover:text-text"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-text-muted">{picked.length ? `${picked.length} picked` : "None picked = any size"}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Max price
          <input
            type="text"
            inputMode="decimal"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value.replace(/[^\d.]/g, ""));
              setError("");
            }}
            placeholder="Any"
            className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-text/30 focus:outline-none"
          />
        </label>
        <Button size="sm" onClick={submit} disabled={busy} className="ml-auto">
          {busy ? "Setting…" : "Set alert"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {done && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-live">
          <LuCircleCheck size={13} /> {done}
        </p>
      )}
    </div>
  );
}
