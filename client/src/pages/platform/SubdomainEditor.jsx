import { useState } from "react";
import { LuPencil } from "react-icons/lu";
import api from "../../lib/api.js";
import Button from "../../components/ui/Button.jsx";

// A store's address on the platform admin page, with "Change": gives the
// store a new <subdomain>.syncstock.io (PUT /api/platform/stores/:id/
// subdomain). The old address keeps forwarding to the new one.
export default function SubdomainEditor({ store, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(store.subdomain);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cleaned = value.toLowerCase().trim();
  const former = (store.former_subdomains || []).filter((s) => s !== store.subdomain);

  const save = async (e) => {
    e.preventDefault();
    if (cleaned === store.subdomain) {
      setEditing(false);
      return;
    }
    const ok = window.confirm(
      `Change ${store.name}'s site from ${store.subdomain}.syncstock.io to ${cleaned}.syncstock.io?\n\n` +
        `Old links and QR signs will forward to the new address. Add the new sitemap in Search Console.`,
    );
    if (!ok) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.put(`/platform/stores/${store.id}/subdomain`, { subdomain: cleaned });
      onChanged(res.data.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't change it. Try again.");
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="min-w-0">
        <p className="text-xs text-text-muted truncate">
          <a
            href={`https://${store.subdomain}.syncstock.io/store`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-text underline-offset-2 hover:underline"
          >
            {store.subdomain}.syncstock.io
          </a>{" "}
          · {store.shopify_domain}
          <button
            type="button"
            onClick={() => {
              setValue(store.subdomain);
              setEditing(true);
            }}
            className="ml-2 inline-flex items-center gap-1 text-text-muted hover:text-text"
          >
            <LuPencil size={11} aria-hidden="true" /> Change
          </button>
        </p>
        {former.length > 0 && (
          <p className="text-[11px] text-text-muted truncate">Forwards from: {former.map((s) => `${s}.syncstock.io`).join(", ")}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mt-1 flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border border-border bg-bg text-sm">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
          maxLength={30}
          autoFocus
          aria-label="New subdomain"
          className="w-40 bg-transparent px-2 py-1.5 outline-none"
        />
        <span className="pr-2 text-text-muted">.syncstock.io</span>
      </div>
      <Button type="submit" variant="primary" size="sm" disabled={saving || cleaned.length < 3}>
        {saving ? "Saving..." : "Save"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setEditing(false);
          setError("");
        }}
      >
        Cancel
      </Button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </form>
  );
}
