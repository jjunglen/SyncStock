import { useEffect, useState } from "react";
import { LuImageOff, LuArrowDownToLine } from "react-icons/lu";
import api from "../../lib/api.js";
import Spinner from "../ui/Spinner.jsx";
import { dropLabel } from "../../lib/dropTime.js";

// The merchant's Coming soon items, each with a drop time (Store settings
// → Coming soon page). Shoppers see "Drops Sat, Nov 22 · 10 AM" on the
// Coming soon page; anyone with an alert for it gets a reminder about an
// hour before. Times are entered and shown in the merchant's own time
// zone (the browser's) and saved as an exact moment.
// The arrow under a time copies it to every item below that has none
// yet (one save for all), for drops where several shoes go live together.

// ISO time → the value a datetime-local input takes, in local time
const toInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const errorText = (err) => err.response?.data?.message || "Couldn't save. Try again.";

function DropRow({ item, value, onChange, onSave, onClear, onCopyDown, below, busy, note }) {
  const changed = value !== toInput(item.drops_at);
  return (
    <li className="py-4">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
          {item.image_url ? (
            <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-500">
              <LuImageOff size={16} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {item.brand && <p className="text-[11px] uppercase tracking-wide text-text-muted">{item.brand}</p>}
          {/* The whole name, wrapped: it's how the merchant knows which shoe it is */}
          <p className="text-sm font-medium leading-snug break-words">{item.name}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {item.drops_at ? `Drops ${dropLabel(item.drops_at)}` : "No drop time"}
            {item.waiting > 0 && ` · ${item.waiting} waiting`}
            {item.sizes.length > 0 && ` · ${item.sizes.join(", ")}`}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-[4.25rem]">
        <input
          type="datetime-local"
          aria-label={`Drop time for ${item.name}`}
          value={value}
          min={toInput(new Date().toISOString())}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:flex-none"
        />
        <button
          type="button"
          disabled={!value || !changed || busy}
          onClick={onSave}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-text disabled:opacity-40"
        >
          {busy ? <Spinner size={14} /> : "Save"}
        </button>
        {item.drops_at && (
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            className="px-2 py-2 text-sm text-text-muted underline hover:text-text disabled:opacity-40"
          >
            Clear
          </button>
        )}
      </div>
      {value && below > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={onCopyDown}
          className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-text-muted hover:bg-text/5 hover:text-text disabled:opacity-40 sm:ml-[4.25rem]"
        >
          <LuArrowDownToLine size={14} aria-hidden="true" />
          Use this time for the {below} item{below === 1 ? "" : "s"} below with no time
        </button>
      )}
      <p aria-live="polite" className="mt-1 text-xs sm:pl-[4.25rem]">
        {note?.error && <span className="text-red-500">{note.error}</span>}
        {note?.saved && <span className="text-text-muted">{note.saved}</span>}
      </p>
    </li>
  );
}

export default function ComingSoonDrops() {
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  // What's typed in each row (product id → datetime-local value)
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(null); // the row saving
  const [notes, setNotes] = useState({}); // product id → { error } / { saved }

  useEffect(() => {
    api
      .get("/store/coming-soon")
      .then((res) => {
        const list = res.data.data || [];
        setItems(list);
        setValues(Object.fromEntries(list.map((i) => [i.product_id, toInput(i.drops_at)])));
      })
      .catch(() => {
        setFailed(true);
        setItems([]);
      });
  }, []);

  // Saved: the rows show the new time
  const applySaved = (ids, dropsAt) => {
    const set = new Set(ids);
    setItems((list) => list.map((i) => (set.has(i.product_id) ? { ...i, drops_at: dropsAt } : i)));
    setValues((v) => ({ ...v, ...Object.fromEntries(ids.map((id) => [id, toInput(dropsAt)])) }));
  };

  const saveOne = async (item, next) => {
    setBusy(item.product_id);
    setNotes((n) => ({ ...n, [item.product_id]: null }));
    try {
      const res = await api.put(`/store/coming-soon/${item.product_id}`, {
        drops_at: next ? new Date(next).toISOString() : null,
      });
      applySaved([item.product_id], res.data.data.drops_at);
      setNotes((n) => ({ ...n, [item.product_id]: { saved: next ? "Saved" : "Cleared" } }));
    } catch (err) {
      setNotes((n) => ({ ...n, [item.product_id]: { error: errorText(err) } }));
    } finally {
      setBusy(null);
    }
  };

  // This row's time, saved for it and every item below with no time
  const copyDown = async (item, index) => {
    const below = items.slice(index + 1).filter((i) => !i.drops_at);
    const ids = [item.product_id, ...below.map((i) => i.product_id)];
    setBusy(item.product_id);
    setNotes((n) => ({ ...n, [item.product_id]: null }));
    try {
      const res = await api.put("/store/coming-soon", {
        product_ids: ids,
        drops_at: new Date(values[item.product_id]).toISOString(),
      });
      applySaved(res.data.data.product_ids, res.data.data.drops_at);
      setNotes((n) => ({ ...n, [item.product_id]: { saved: `Saved for this and ${below.length} below` } }));
    } catch (err) {
      setNotes((n) => ({ ...n, [item.product_id]: { error: errorText(err) } }));
    } finally {
      setBusy(null);
    }
  };

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
          {items.map((item, index) => (
            <DropRow
              key={item.product_id}
              item={item}
              value={values[item.product_id] || ""}
              onChange={(v) => {
                setValues((all) => ({ ...all, [item.product_id]: v }));
                setNotes((n) => ({ ...n, [item.product_id]: null }));
              }}
              onSave={() => saveOne(item, values[item.product_id])}
              onClear={() => saveOne(item, null)}
              onCopyDown={() => copyDown(item, index)}
              below={items.slice(index + 1).filter((i) => !i.drops_at).length}
              busy={busy === item.product_id}
              note={notes[item.product_id]}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
