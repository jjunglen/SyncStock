import { useState } from "react";
import { LuPencil, LuTrash2, LuFootprints } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import Switch from "../ui/Switch.jsx";
import api from "../../lib/api.js";
import { CONDITION_OPTIONS, conditionLabel } from "../../lib/alertOptions.js";
import PriceRangeSlider from "../ui/PriceRangeSlider.jsx";
import { rangeFromPrices, pricesFromRange, priceRangeLabel } from "../../lib/priceRange.js";

// One alert on the "Your alerts" tab: switch notifications on/off, edit its
// price range and new-or-pre-owned setting, or delete it.
export default function AlertCard({ alert, onDelete, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [priceRange, setPriceRange] = useState(() => rangeFromPrices(alert.min_price, alert.max_price));
  const [condition, setCondition] = useState(alert.condition_preference || "either");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // A photo that fails to load shows the placeholder instead
  const [imageFailed, setImageFailed] = useState(false);

  const save = async (changes) => {
    setSaving(true);
    setError("");
    try {
      const res = await api.put(`/alerts/${alert.id}`, changes);
      onUpdated(res.data.data);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const ok = await save({ ...pricesFromRange(priceRange), condition_preference: condition });
    if (ok) setEditing(false);
  };

  const handleCancel = () => {
    setPriceRange(rangeFromPrices(alert.min_price, alert.max_price));
    setCondition(alert.condition_preference || "either");
    setError("");
    setEditing(false);
  };

  const inputClass =
    "w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none";

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* The shoe's photo on a white tile (photos are shot on white) */}
      <div className={`relative bg-white h-40 flex items-center justify-center transition-opacity ${alert.active ? "" : "opacity-60"}`}>
        {alert.image_url && !imageFailed ? (
          <img
            src={alert.image_url}
            alt={alert.product_name}
            loading="lazy"
            className="h-full w-full object-contain p-3"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <LuFootprints size={32} className="text-neutral-300" aria-hidden="true" />
        )}
        {alert.size && (
          <span className="absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/70 text-white">
            {alert.size}
          </span>
        )}
      </div>

      <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`min-w-0 transition-opacity ${alert.active ? "" : "opacity-60"}`}>
          <p className="text-sm font-medium text-text line-clamp-2">{alert.product_name}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {[
              priceRangeLabel(alert.min_price, alert.max_price),
              alert.condition_preference && alert.condition_preference !== "either"
                ? conditionLabel(alert.condition_preference)
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Any price · Brand New or Pre-Owned"}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-text-muted hover:text-text transition-colors"
              aria-label={`Edit alert for ${alert.product_name}`}
            >
              <LuPencil size={16} />
            </button>
          )}
          <button
            onClick={() => onDelete(alert.id)}
            className="p-1.5 text-text-muted hover:text-danger transition-colors"
            aria-label={`Delete alert for ${alert.product_name}`}
          >
            <LuTrash2 size={17} />
          </button>
        </div>
      </div>

      {/* On = we'll notify them; off = kept, but no notifications */}
      <label className="mt-3 flex items-center gap-2.5 cursor-pointer w-fit">
        <Switch
          size="sm"
          checked={alert.active}
          disabled={saving}
          label={`Notifications for ${alert.product_name}`}
          onChange={(on) => save({ active: on })}
        />
        <span className={`text-xs ${alert.active ? "text-text" : "text-text-muted"}`}>
          {alert.active ? "Notifications on" : "Paused"}
        </span>
      </label>

      {editing && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <PriceRangeSlider value={priceRange} onChange={setPriceRange} />
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inputClass}>
              {CONDITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" fullWidth onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" fullWidth onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={14} /> : "Save"}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
