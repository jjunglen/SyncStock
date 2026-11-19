import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuBellRing, LuCheck, LuX } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import api from "../../lib/api.js";
import { SIZES_BY_CATEGORY } from "../../lib/categories.js";
import { showToast } from "../../lib/toast.js";
import { getMySizes, trackSizes, trackedMessage, useTrackedSizes } from "../../lib/quickTrack.js";

// "Want to know when it's in your size?" — opened by a product's Track
// bell. Every size of the item's category (or the item's own sizes for
// categories with no size chart), several at a time. The shopper's saved
// sizes start picked; sizes already tracked show as on. Sizes the store
// has in stock right now are marked.
// preselect: a size picked on the product page, picked here too.
export default function TrackSizesModal({ item, onClose, preselect = null }) {
  const tracked = useTrackedSizes(item);
  const chart = SIZES_BY_CATEGORY[item.category || "sneakers"] || [];
  const [inStock, setInStock] = useState(() => new Set(item.size && item.available !== 0 ? [item.size] : []));
  const [listed, setListed] = useState(() => (item.size ? [item.size] : []));
  const [picked, setPicked] = useState(() => new Set(preselect ? [preselect] : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // What the store has of this item (each size in stock is marked)
  useEffect(() => {
    if (!item.shopify_product_id) return;
    let active = true;
    api
      .get(`/inventory/product/${item.shopify_product_id}`)
      .then((res) => {
        if (!active) return;
        const { sizes = [], others = [] } = res.data.data || {};
        const now = new Set([...sizes.filter((s) => s.in_stock), ...others].map((s) => s.size).filter(Boolean));
        setInStock(now);
        setListed((prev) => [...new Set([...prev, ...sizes.map((s) => s.size), ...others.map((s) => s.size)].filter(Boolean))]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [item.shopify_product_id]);

  // Their saved sizes start picked (unless a size was picked on the page)
  useEffect(() => {
    if (preselect) return;
    let active = true;
    getMySizes()
      .then((sizes) => {
        if (!active) return;
        const options = chart.length ? chart : listed;
        setPicked((prev) => (prev.size ? prev : new Set(sizes.filter((s) => options.includes(s)))));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // Once, when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // The category's chart, plus any size the store lists that isn't on it
  const options = chart.length ? [...chart, ...listed.filter((s) => !chart.includes(s))] : listed;
  const newPicks = [...picked].filter((s) => !tracked.has(s));

  const toggle = (size) => {
    if (tracked.has(size)) return;
    setError("");
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(size)) next.delete(size);
      else next.add(size);
      return next;
    });
  };

  const save = async () => {
    if (!newPicks.length) {
      setError("Pick at least one size");
      return;
    }
    setSaving(true);
    try {
      const result = await trackSizes(item, newPicks);
      showToast({ message: trackedMessage(result), link: { to: "/store/dashboard?tab=alerts", label: "Your alerts" } });
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-end justify-center md:items-center md:p-4" role="dialog" aria-modal="true" aria-labelledby="track-sizes-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface text-text md:max-w-md md:rounded-2xl">
        <div className="flex items-start gap-3 border-b border-border p-4">
          {item.image_url && (
            <img src={item.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain p-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <p id="track-sizes-title" className="font-semibold">Want to know when it's in your size?</p>
            <p className="mt-0.5 truncate text-xs text-text-muted">{item.product_name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-1 p-1 text-text-muted hover:text-text">
            <LuX size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <p className="mb-3 text-xs text-text-muted">Pick as many sizes as you like. We'll tell you the moment one is in stock or drops in price.</p>
          {options.length === 0 ? (
            <div className="flex justify-center py-6"><Spinner size={20} /></div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Sizes">
              {options.map((size) => {
                const on = tracked.has(size);
                const isPicked = on || picked.has(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggle(size)}
                    aria-pressed={isPicked}
                    disabled={on}
                    className={`relative rounded-lg border px-1 py-2.5 text-sm transition-colors ${
                      on
                        ? "track-on-soft"
                        : isPicked
                          ? "border-text bg-text text-bg font-medium"
                          : "border-border hover:border-text/40"
                    }`}
                  >
                    {size}
                    {on ? (
                      <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px]"><LuCheck size={10} aria-hidden="true" /> Tracking</span>
                    ) : inStock.has(size) ? (
                      <span className={`mt-0.5 block text-[10px] ${isPicked ? "text-bg/70" : "text-live"}`}>In stock</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-warn">{error}</p>}
        </div>

        <div className="border-t border-border p-4">
          <Button variant="primary" fullWidth onClick={save} disabled={saving}>
            <span className="flex items-center justify-center gap-2">
              {saving ? <Spinner size={16} /> : <LuBellRing size={16} aria-hidden="true" />}
              {newPicks.length > 1 ? `Notify me in ${newPicks.length} sizes` : newPicks.length === 1 ? `Notify me in size ${newPicks[0]}` : "Notify me"}
            </span>
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
