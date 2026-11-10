import { useState } from "react";
import Switch from "../ui/Switch.jsx";
import Button from "../ui/Button.jsx";
import api from "../../lib/api.js";

// Store settings → "Buying from shoppers (Beta)": the Sell your items
// switch, the margins suggested offers keep, and the store credit bonus.
// Numbers save together with their button; the switch saves straight away.
//   settings / busy / run — from the settings page (run saves and flashes)
export default function BuyingSettings({ settings, busy, run }) {
  const [draft, setDraft] = useState(() => ({
    buy_margin_new: settings.buy_margin_new,
    buy_margin_used: settings.buy_margin_used,
    credit_bonus: settings.credit_bonus,
  }));
  const changed =
    draft.buy_margin_new !== settings.buy_margin_new ||
    draft.buy_margin_used !== settings.buy_margin_used ||
    draft.credit_bonus !== settings.credit_bonus;

  const field = (key, label, hint, max) => (
    <label className="block">
      <span className="text-sm">{label}</span>
      <span className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          step={1}
          value={draft[key]}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value === "" ? "" : Number(e.target.value) }))}
          className="w-20 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-text/10"
        />
        <span className="text-sm text-text-muted">%</span>
      </span>
      <span className="mt-1 block text-xs text-text-muted">{hint}</span>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">
          Show <span className="font-medium">Sell your items</span> on my store site
        </span>
        <Switch
          label="Sell your items"
          checked={settings.sell_enabled}
          disabled={busy === "sell"}
          onChange={(value) =>
            run("sell", () => api.put("/store/settings", { sell_enabled: value }), value ? "Sell your items is on" : "Sell your items is off")
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {field("buy_margin_new", "Brand new margin", "Offer = typical payout × (1 − margin)", 90)}
        {field("buy_margin_used", "Pre-owned margin", "Used for worn, tried-on and pre-owned items", 90)}
        {field("credit_bonus", "Store credit bonus", "Extra for taking credit. 0 = cash only", 50)}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={!changed || busy === "buying"}
          onClick={() => run("buying", () => api.put("/store/settings", draft), "Buying settings saved")}
        >
          Save buying settings
        </Button>
        {changed && <span className="text-xs text-text-muted">Unsaved changes</span>}
      </div>
    </div>
  );
}
