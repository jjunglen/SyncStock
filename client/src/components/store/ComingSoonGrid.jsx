import { useEffect, useState } from "react";
import { LuBellRing, LuImageOff, LuUsers } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import Drawer from "../ui/Drawer.jsx";
import api from "../../lib/api.js";
import { formatPrice } from "../../lib/productPath.js";
import { searchAlertPath } from "../../lib/searchAlert.js";
import { categoryLabel } from "../../lib/categories.js";
import { itemConditionLabel } from "../../lib/alertOptions.js";
import { boxLabel } from "../../lib/sellLabels.js";
import { dropLabel, dropCountdown } from "../../lib/dropTime.js";

// The store's Coming soon items (GET /inventory/coming-soon): products
// with no stock that aren't on the website yet or have no photo. A tile
// opens its details (sizes, condition, drop time, StockX's colorway);
// "Alert me" opens Track with it looked up (signed-out shoppers
// sign up first) — the alert fires once it's in stock and live.
// Used by the shopper site's /coming-soon page and the dashboard's tab.
//   category: one category, or all the store shows
//   signedIn: true / false / null (still checking)

// "Size 10M/11.5W", "Sizes 9M, 10M, 11M", "Sizes 7M, 8M, 9M +4"
// "3 people waiting" (shoppers with an alert for it); nothing at 0
const waitingText = (n) => (n > 0 ? `${n} ${n === 1 ? "person" : "people"} waiting` : null);

const sizesText = (sizes) => {
  if (sizes.length === 0) return null;
  if (sizes.length === 1) return `Size ${sizes[0]}`;
  const shown = sizes.slice(0, 3).join(", ");
  return `Sizes ${shown}${sizes.length > 3 ? ` +${sizes.length - 3}` : ""}`;
};


function Photo({ item, large = false }) {
  const [broken, setBroken] = useState(false);
  if (item.image_url && !broken) {
    return (
      <img
        src={item.image_url}
        alt={item.name}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`h-full w-full object-contain ${large ? "p-4" : "p-3"}`}
      />
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-neutral-100 text-neutral-500">
      <LuImageOff size={large ? 28 : 22} aria-hidden="true" />
      <span className="text-xs font-medium">Photo coming soon</span>
    </div>
  );
}

function AlertButton({ item, signedIn }) {
  if (signedIn === null) return null;
  return (
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
  );
}

function Details({ item, otherName }) {
  const condition = itemConditionLabel(item);
  const box = item.box_status && boxLabel(item.box_status, item.category);
  const stockx = item.stockx || {};
  const rows = [
    ["Price", formatPrice(item.price)],
    ["Condition", condition],
    ["Box", box],
    ["Colorway", stockx.colorway],
    ["Style code", item.sku || stockx.style_code],
    ["Category", categoryLabel(item.category, otherName)],
  ].filter(([, v]) => v);

  return (
    <div className="space-y-5 px-1">
      <div className="relative h-56 overflow-hidden rounded-xl bg-white">
        <Photo item={item} large />
        {item.photo_source === "stockx" && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">Stock photo</span>
        )}
      </div>
      <div>
        {item.brand && <p className="text-xs uppercase tracking-wide text-text-muted">{item.brand}</p>}
        <p className="mt-0.5 font-medium leading-snug">{item.name}</p>
        {waitingText(item.waiting) && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium">
            <LuUsers size={15} aria-hidden="true" /> {waitingText(item.waiting)} on this one
          </p>
        )}
      </div>
      {item.drops_at && dropCountdown(item.drops_at) && (
        <div className="rounded-xl border border-border bg-surface-muted px-3 py-2.5">
          <p className="text-sm font-medium">Drops {dropLabel(item.drops_at)}</p>
          <p className="text-xs text-text-muted">
            {dropCountdown(item.drops_at)}. Set an alert and we'll remind you about an hour before.
          </p>
        </div>
      )}
      {item.sizes.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-text-muted">Sizes coming</p>
          <ul className="flex flex-wrap gap-1.5">
            {item.sizes.map((s) => (
              <li key={s} className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {rows.length > 0 && (
        <dl className="divide-y divide-border rounded-xl border border-border text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-3 py-2.5">
              <dt className="text-text-muted">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {item.description && <p className="whitespace-pre-line text-sm text-text-muted">{item.description}</p>}
    </div>
  );
}

export default function ComingSoonGrid({ category = null, signedIn, otherName = null }) {
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  // The item in the details panel; kept while the panel slides away
  const [open, setOpen] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const show = (item) => {
    setOpen(item);
    setPanelOpen(true);
  };

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
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.product_id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-linear-to-b from-card to-card-end">
            <button
              type="button"
              onClick={() => show(item)}
              className="flex flex-1 flex-col text-left"
              aria-label={`Details for ${item.name}`}
            >
              <div className="relative h-32 w-full sm:h-40 bg-white">
                <Photo item={item} />
                <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                  Coming soon
                </span>
                {waitingText(item.waiting) && (
                  <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                    <LuUsers size={11} aria-hidden="true" /> {waitingText(item.waiting)}
                  </span>
                )}
              </div>
              <div className="flex w-full flex-col p-3 pb-0">
                {item.brand && <p className="text-[11px] uppercase tracking-wide text-text-muted truncate">{item.brand}</p>}
                <p className="text-xs font-medium leading-tight line-clamp-2 min-h-[2.5em]">{item.name}</p>
                <p className="mt-1 text-xs text-text-muted truncate">
                  {[formatPrice(item.price), !category && categoryLabel(item.category, otherName)].filter(Boolean).join(" · ")}
                </p>
                {sizesText(item.sizes) && <p className="mt-0.5 text-xs text-text-muted truncate">{sizesText(item.sizes)}</p>}
                {item.drops_at && dropCountdown(item.drops_at) && (
                  <p className="mt-1 text-xs font-medium truncate">Drops {dropLabel(item.drops_at)}</p>
                )}
              </div>
            </button>
            <div className="mt-auto p-3">
              <AlertButton item={item} signedIn={signedIn} />
            </div>
          </li>
        ))}
      </ul>

      <Drawer
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Coming soon"
        wide
        footer={open && <AlertButton item={open} signedIn={signedIn} />}
      >
        {open && <Details item={open} otherName={otherName} />}
      </Drawer>
    </>
  );
}
