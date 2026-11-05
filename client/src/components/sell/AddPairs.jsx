import { useEffect, useState } from "react";
import { LuSearch, LuCircleX, LuCircleCheck, LuFootprints, LuMinus, LuPlus, LuArrowLeft } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import api from "../../lib/api.js";
import { CATEGORY_META, SIZES_BY_CATEGORY } from "../../lib/categories.js";
import { categoryFromStockx } from "../../lib/stockxCategory.js";

// "Add pairs" in Sell your items: find the item (StockX search, or describe
// it), tap every size you have, then set condition, box and price per
// size. Duplicates of a size use + / −. Photos come next, in the batch.
//   onAdded(draft) — the batch after the pairs were added
//   onCancel()

const CONDITIONS = [
  { key: "new", label: "Brand new" },
  { key: "used", label: "Pre-owned" },
];
const BOXES = [
  { key: "original", label: "Original box" },
  { key: "damaged", label: "Damaged box" },
  { key: "none", label: "No box" },
];

function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 p-1 border border-text/15 rounded-xl bg-surface-muted" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={`px-2 py-2 rounded-lg text-xs sm:text-sm leading-tight transition-colors ${
            value === o.key ? "bg-primary text-primary-text font-semibold shadow-sm" : "text-text hover:bg-text/10"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const newGroup = () => ({ qty: 1, condition: "used", box: "original", notes: "", asking: "" });

export default function AddPairs({ onAdded, onCancel }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [picked, setPicked] = useState(null); // a StockX result
  const [describe, setDescribe] = useState(false); // "describe it instead"
  const [name, setName] = useState("");
  const [category, setCategory] = useState("sneakers");
  const [sizes, setSizes] = useState({}); // size → group
  const [mySizes, setMySizes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setMySizes(res.data.data.sizes || []))
      .catch(() => {});
  }, []);

  // StockX search, after a short pause in typing
  useEffect(() => {
    if (describe || picked || !query.trim()) return undefined;
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchFailed(false);
      try {
        const res = await api.get(`/stockx/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res.data.data || []);
      } catch {
        setResults([]);
        setSearchFailed(true);
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [query, describe, picked]);

  const choose = (item) => {
    setPicked(item);
    // Selling cards comes later: cards keep the current type
    const found = categoryFromStockx(item);
    const next = (found !== "trading_cards" && found) || category;
    if (next !== category) {
      setCategory(next);
      setSizes({});
    }
    setError("");
  };

  const allSizes = SIZES_BY_CATEGORY[category] || [];
  const mine = mySizes.filter((s) => allSizes.includes(s));
  const toggleSize = (size) =>
    setSizes((prev) => {
      const next = { ...prev };
      if (next[size]) delete next[size];
      else next[size] = newGroup();
      return next;
    });
  const setGroup = (size, change) => setSizes((prev) => ({ ...prev, [size]: { ...prev[size], ...change } }));

  const chosen = allSizes.filter((s) => sizes[s]);
  const pairCount = chosen.reduce((n, s) => n + sizes[s].qty, 0);
  const itemName = describe ? name.trim() : picked?.title;

  const add = async () => {
    if (!itemName) return setError(describe ? "Name the item" : "Search for the item and pick it");
    if (!chosen.length) return setError("Tap at least one size");
    setSaving(true);
    setError("");
    try {
      const items = chosen.flatMap((size) =>
        Array.from({ length: sizes[size].qty }, () => ({
          product_name: itemName,
          style_code: describe ? null : picked.styleId || null,
          stockx_product_id: describe ? null : picked.productId || null,
          image_url: describe ? null : picked.image_url || null,
          category,
          size,
          condition: sizes[size].condition,
          box: sizes[size].box,
          notes: sizes[size].notes.trim() || null,
          asking_price: sizes[size].asking.trim() || null,
        })),
      );
      const res = await api.post("/sell/items", { items });
      onAdded(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't add those pairs. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <button type="button" onClick={onCancel} className="mb-4 flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <LuArrowLeft size={16} /> Back to your batch
      </button>
      <h2 className="text-lg font-semibold">Add pairs</h2>
      <p className="text-sm text-text-muted mb-5">Same item, one or more sizes. You'll add photos next.</p>

      {/* The item */}
      {picked ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary bg-surface p-3">
          <div className="h-14 w-14 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
            {picked.image_url ? <img src={picked.image_url} alt="" className="h-full w-full object-contain" /> : <LuFootprints className="text-neutral-300" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{picked.title}</p>
            <p className="text-xs text-text-muted">{picked.styleId} · from StockX</p>
          </div>
          <button type="button" onClick={() => setPicked(null)} className="text-sm text-text-muted hover:text-text underline">
            Change
          </button>
        </div>
      ) : describe ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <label className="block">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">What is it?</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="Supreme Box Logo Hoodie FW21 Black"
              className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-text/10"
            />
          </label>
          <Segmented
            label="Type"
            options={["sneakers", "clothing"].map((k) => ({ key: k, label: CATEGORY_META[k].label }))}
            value={category}
            onChange={(k) => {
              setCategory(k);
              setSizes({});
            }}
          />
          <p className="text-xs text-text-muted">Be specific — brand, model, colorway and year help the store price it.</p>
          <button type="button" onClick={() => setDescribe(false)} className="text-sm underline text-text-muted hover:text-text">
            Search StockX instead
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) setResults([]);
              }}
              placeholder="Search by name or style code"
              aria-label="Search by name or style code"
              className="w-full bg-surface-muted border border-border rounded-xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-text/10"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); setResults([]); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                <LuCircleX size={16} />
              </button>
            )}
          </div>
          {searching && <p className="text-xs text-text-muted py-3">Searching StockX...</p>}
          {searchFailed && <p className="text-xs text-danger py-3">StockX search isn't answering right now. Describe the item instead.</p>}
          {!searching && results.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {results.slice(0, 8).map((item) => (
                <button
                  type="button"
                  key={item.productId}
                  onClick={() => choose(item)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface hover:border-text/20 text-left"
                >
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                    {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-contain" /> : <LuFootprints className="text-neutral-300" />}
                  </div>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{item.title}</span>
                    <span className="block text-xs text-text-muted">{item.styleId}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {!searching && query.trim() && results.length === 0 && !searchFailed && <p className="text-xs text-text-muted py-3">No matches on StockX.</p>}
          <p className="mt-3 text-sm">
            <span className="text-text-muted">Can't find it? </span>
            <button type="button" onClick={() => setDescribe(true)} className="underline">
              Describe it instead
            </button>
          </p>
        </div>
      )}

      {/* Sizes */}
      {(picked || describe) && (
        <div className="mt-6">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Sizes <span className="normal-case tracking-normal">— tap every size you have</span>
          </p>
          {mine.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {mine.map((s) => (
                <SizePill key={`mine-${s}`} size={s} on={!!sizes[s]} onClick={() => toggleSize(s)} />
              ))}
              <span className="self-center text-xs text-text-muted">Your sizes</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {allSizes.filter((s) => !mine.includes(s)).map((s) => (
              <SizePill key={s} size={s} on={!!sizes[s]} onClick={() => toggleSize(s)} />
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {chosen.map((size) => {
              const g = sizes[size];
              return (
                <div key={size} className="rounded-xl border border-border bg-surface p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">Size {size}</p>
                    <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1 text-sm">
                      <button type="button" aria-label={`One fewer size ${size}`} disabled={g.qty <= 1} onClick={() => setGroup(size, { qty: g.qty - 1 })} className="p-0.5 disabled:opacity-30">
                        <LuMinus size={14} />
                      </button>
                      <span>
                        {g.qty} {g.qty === 1 ? "pair" : "pairs"}
                      </span>
                      <button type="button" aria-label={`One more size ${size}`} disabled={g.qty >= 5} onClick={() => setGroup(size, { qty: g.qty + 1 })} className="p-0.5 disabled:opacity-30">
                        <LuPlus size={14} />
                      </button>
                    </div>
                  </div>
                  <Segmented label={`Condition, size ${size}`} options={CONDITIONS} value={g.condition} onChange={(v) => setGroup(size, { condition: v })} />
                  <Segmented label={`Box, size ${size}`} options={BOXES} value={g.box} onChange={(v) => setGroup(size, { box: v })} />
                  <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
                    <input
                      value={g.notes}
                      onChange={(e) => setGroup(size, { notes: e.target.value })}
                      maxLength={500}
                      placeholder="Notes (optional) — worn twice, small scuff"
                      aria-label={`Notes, size ${size}`}
                      className="rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-text/10"
                    />
                    <input
                      value={g.asking}
                      onChange={(e) => setGroup(size, { asking: e.target.value })}
                      inputMode="decimal"
                      placeholder="Asking $ (optional)"
                      aria-label={`Asking price, size ${size}`}
                      className="rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-text/10"
                    />
                  </div>
                  <p className="text-xs text-text-muted">
                    {g.condition === "used" ? "Pre-owned needs 4 photos" : "Brand new needs 2 photos"} per pair — you'll add them next.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-5">
        <Button variant="primary" size="lg" fullWidth disabled={saving || !pairCount} onClick={add}>
          {saving ? <Spinner size={18} /> : pairCount ? `Add ${pairCount} pair${pairCount === 1 ? "" : "s"} to batch` : "Pick a size to add pairs"}
        </Button>
      </div>
    </div>
  );
}

function SizePill({ size, on, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-w-12 rounded-full border px-3 py-2 text-sm transition-colors ${
        on ? "bg-primary text-primary-text border-primary" : "border-border text-text hover:border-text/30"
      }`}
    >
      {on && <LuCircleCheck size={12} className="inline mr-1 -mt-0.5" aria-hidden="true" />}
      {size}
    </button>
  );
}
