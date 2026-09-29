import { useState } from "react";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import Switch from "../ui/Switch.jsx";
import api from "../../lib/api.js";
import { CONDITION_OPTIONS, conditionLabel } from "../../lib/alertOptions.js";

// One alert on the "Your alerts" tab: switch notifications on/off, edit its max price
// and new-or-pre-owned setting, or delete it.
export default function AlertCard({ alert, onDelete, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [maxPrice, setMaxPrice] = useState(alert.max_price ? String(parseFloat(alert.max_price)) : "");
  const [condition, setCondition] = useState(alert.condition_preference || "either");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    const ok = await save({ max_price: maxPrice || null, condition_preference: condition });
    if (ok) setEditing(false);
  };

  const handleCancel = () => {
    setMaxPrice(alert.max_price ? String(parseFloat(alert.max_price)) : "");
    setCondition(alert.condition_preference || "either");
    setError("");
    setEditing(false);
  };

  const inputClass =
    "w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none";

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`min-w-0 transition-opacity ${alert.active ? "" : "opacity-60"}`}>
          <p className="text-sm font-medium text-text truncate">{alert.product_name}</p>
          <p className="text-xs text-text-muted">
            {[
              alert.size,
              alert.max_price && `Max $${parseFloat(alert.max_price).toFixed(0)}`,
              alert.condition_preference && alert.condition_preference !== "either"
                ? conditionLabel(alert.condition_preference)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
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
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Max price (leave empty for any)</label>
            <input
              type="number"
              min="1"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any price"
              className={inputClass}
            />
          </div>
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
  );
}
