import { useEffect, useState } from "react";
import { LuBellRing, LuImageOff } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import api from "../../lib/api.js";
import { formatPrice } from "../../lib/productPath.js";
import { searchAlertPath } from "../../lib/searchAlert.js";
import { categoryLabel } from "../../lib/categories.js";

// The store's Coming soon items (GET /inventory/coming-soon): products
// with no stock that aren't on the website yet or have no photo. Each has
// "Alert me when it drops", which opens Track with it looked up (signed-out
// shoppers sign up first) — the alert fires once it's in stock and live.
// Used by the shopper site's /coming-soon page and the dashboard's tab.
//   category: one category, or all the store shows
//   signedIn: true / false / null (still checking)
export default function ComingSoonGrid({ category = null, signedIn, otherName = null }) {
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    api
      .get(`/inventory/coming-soon${params}`, { signal: controller.signal })
      .then((res) => {
        setFailed(false);
        setItems(res.data.data || []);
      })
      .catch((err) => {
        if (err?.code === "ERR_CANCELED") return;
        setFailed(true);
        setItems([]);
      });
    return () => controller.abort();
  }, [category]);

  if (items === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={20} />
      </div>
    );
  }
  if (failed || items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-text-muted">
        {failed ? "Coming soon couldn't load. Refresh to try again." : "Nothing coming soon right now. Check back after the next drop."}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.product_id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-linear-to-b from-card to-card-end">
          <div className="relative h-32 sm:h-40 bg-white">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} loading="lazy" className="h-full w-full object-contain p-3" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-neutral-100 text-neutral-500">
                <LuImageOff size={22} aria-hidden="true" />
                <span className="text-xs font-medium">Photo coming soon</span>
              </div>
            )}
            <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
              Coming soon
            </span>
          </div>
          <div className="flex flex-1 flex-col p-3">
            {item.brand && <p className="text-[11px] uppercase tracking-wide text-text-muted truncate">{item.brand}</p>}
            <p className="text-xs font-medium leading-tight line-clamp-2 min-h-[2.5em]">{item.name}</p>
            <p className="mt-1 text-xs text-text-muted truncate">
              {[formatPrice(item.price), !category && categoryLabel(item.category, otherName), item.sizes.length > 0 && `${item.sizes.length} size${item.sizes.length === 1 ? "" : "s"}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-auto pt-3">
              {signedIn !== null && (
                <Button
                  to={searchAlertPath(item.name, item.category, signedIn)}
                  rel="nofollow"
                  variant="primary"
                  size="sm"
                  fullWidth
                  aria-label={`Alert me when ${item.name} drops`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <LuBellRing size={14} aria-hidden="true" /> Alert me
                  </span>
                </Button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
