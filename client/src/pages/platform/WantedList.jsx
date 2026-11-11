import { useEffect, useState } from "react";
import { LuFootprints, LuX } from "react-icons/lu";
import api from "../../lib/api.js";

// "Most wanted" on the platform admin page: one product row, and the
// "See all" pop-out with every product shoppers are waiting on.

const count = (n) => Number(n || 0).toLocaleString();
const CATEGORY_LABELS = { all: "All", sneakers: "Sneakers", clothing: "Clothing & accessories" };

// Photo, the sizes wanted most, and how many shoppers at how many stores
export function WantedItem({ item, rank }) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="w-6 text-sm text-text-muted shrink-0">{rank}</span>
      <div className="size-12 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
        ) : (
          <LuFootprints size={18} className="text-neutral-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium line-clamp-2">{item.product_name}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.top_sizes.map((s) => (
            <span key={s.size} className="text-[11px] px-1.5 py-0.5 rounded bg-text/10 text-text-muted">
              {s.size}
              {s.shoppers > 1 && ` ×${s.shoppers}`}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold">{count(item.shoppers)}</p>
        <p className="text-[11px] text-text-muted">
          {item.stores} {item.stores === 1 ? "store" : "stores"}
        </p>
      </div>
    </li>
  );
}

// Every product with an active alert, in the chosen category
export function AllWanted({ category, onClose }) {
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/platform/demand", { params: { category, all: 1 } })
      .then((res) => active && setItems(res.data.data.most_wanted))
      .catch(() => active && setFailed(true));
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      active = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [category, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Everything shoppers want"
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-surface"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 shrink-0">
          <div>
            <p className="font-semibold">Everything shoppers want</p>
            <p className="text-xs text-text-muted">
              {CATEGORY_LABELS[category] || "All"} · active alerts across every store
              {items ? ` · ${count(items.length)} products` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text" aria-label="Close">
            <LuX size={22} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {failed ? (
            <p className="text-sm text-danger">Couldn&apos;t load the list.</p>
          ) : !items ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : (
            <ol className="divide-y divide-border">
              {items.map((item, i) => (
                <WantedItem key={item.product_key} item={item} rank={i + 1} />
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
