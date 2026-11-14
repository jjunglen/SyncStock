import { useEffect, useState } from "react";
import { LuImageOff } from "react-icons/lu";
import api from "../../lib/api.js";
import Spinner from "../ui/Spinner.jsx";
import { dropLabel } from "../../lib/dropTime.js";

// The merchant's Coming soon items, each with a drop time (Store settings
// → Coming soon page). Shoppers see "Drops Sat, Nov 22 · 10 AM" on the
// Coming soon page; anyone with an alert for it gets a reminder about an
// hour before. Times are entered and shown in the merchant's own time
// zone (the browser's) and saved as an exact moment.

// ISO time → the value a datetime-local input takes, in local time
const toInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function DropRow({ item, onSaved }) {
  const [value, setValue] = useState(toInput(item.drops_at));
  const [state, setState] = useState({ busy: false, error: "", saved: false });
  const changed = value !== toInput(item.drops_at);

  const save = async (next) => {
    setState({ busy: true, error: "", saved: false });
    try {
      const res = await api.put(`/store/coming-soon/${item.product_id}`, {
        drops_at: next ? new Date(next).toISOString() : null,
      });
      onSaved(item.product_id, res.data.data.drops_at);
      setValue(toInput(res.data.data.drops_at));
      setState({ busy: false, error: "", saved: true });
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.message || "Couldn't save. Try again.", saved: false });
    }
  };

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
          {item.image_url ? (
            <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-500">
              <LuImageOff size={16} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="truncate text-xs text-text-muted">
            {item.drops_at ? `Drops ${dropLabel(item.drops_at)}` : "No drop time"}
            {item.sizes.length > 0 && ` · ${item.sizes.length} size${item.sizes.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="datetime-local"
          aria-label={`Drop time for ${item.name}`}
          value={value}
          min={toInput(new Date().toISOString())}
          onChange={(e) => {
            setValue(e.target.value);
            setState((s) => ({ ...s, saved: false, error: "" }));
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!value || !changed || state.busy}
          onClick={() => save(value)}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-text disabled:opacity-40"
        >
          {state.busy ? <Spinner size={14} /> : "Save"}
        </button>
        {item.drops_at && (
          <button
            type="button"
            disabled={state.busy}
            onClick={() => save(null)}
            className="px-2 py-2 text-sm text-text-muted underline hover:text-text disabled:opacity-40"
          >
            Clear
          </button>
        )}
        <span aria-live="polite" className="text-xs">
          {state.error && <span className="text-red-500">{state.error}</span>}
          {state.saved && <span className="text-text-muted">Saved</span>}
        </span>
      </div>
    </li>
  );
}

export default function ComingSoonDrops() {
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .get("/store/coming-soon")
      .then((res) => setItems(res.data.data || []))
      .catch(() => {
        setFailed(true);
        setItems([]);
      });
  }, []);

  const onSaved = (productId, dropsAt) =>
    setItems((list) => list.map((i) => (i.product_id === productId ? { ...i, drops_at: dropsAt } : i)));

  return (
    <div className="mt-6 border-t border-border pt-5">
      <p className="text-sm font-medium">Drop times</p>
      <p className="mt-1 text-xs text-text-muted">
        Optional. Shoppers see when each item drops, and anyone with an alert for it gets a reminder about an hour
        before. The restock alert still goes out when it's in stock. Times are in your time zone.
      </p>
      {items === null ? (
        <div className="flex justify-center py-6">
          <Spinner size={18} />
        </div>
      ) : items.length === 0 ? (
        <p className="py-4 text-sm text-text-muted">
          {failed
            ? "Your Coming soon items couldn't load. Refresh to try again."
            : "Nothing coming soon yet. Items show here once they're published with no stock (not on your website yet, or no photo)."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((item) => (
            <DropRow key={item.product_id} item={item} onSaved={onSaved} />
          ))}
        </ul>
      )}
    </div>
  );
}
