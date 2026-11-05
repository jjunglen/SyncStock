import { useRef, useState } from "react";
import { LuUpload, LuDownload, LuCircleCheck } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import api from "../../lib/api.js";

// Pricing → "Import sales": the merchant uploads their past sales (the
// SyncStock CSV template) so "Your listings" has something to compare
// against. Preview first (nothing saved), then import. Rows already saved
// are skipped, so re-uploading a sheet with new rows only adds those.
//   onImported — called after a real import (the page reloads its data)
const TEMPLATE_URL = "/syncstock-sales-template.csv";
const MAX_BYTES = 15 * 1024 * 1024;

const COLUMNS = [
  ["Item name", "as you list it"],
  ["Size", "any size — 10, M, 158cm, ring 7; blank if none"],
  ["Condition note", "blank = new; Used, Worn or Pre-owned = used"],
  ["Style code (SKU)", "optional, but matches best"],
  ["Sold price", "what you got for it"],
  ["Cost", "optional — what you paid"],
  ["Date bought", "optional — 10/5/26 or 2026-10-05"],
  ["Margin", "leave blank"],
  ["Date sold", "required"],
  ["Sales channel", "Website, In store, eBay, StockX…"],
];

export default function SalesImport({ onImported, compact = false }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null); // { name, text }
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(!compact);

  const send = (text, name, dryRun) =>
    api.post(`/analytics/sales-import?file=${encodeURIComponent(name)}${dryRun ? "&dry_run=1" : ""}`, text, {
      headers: { "Content-Type": "text/csv" },
    });

  const choose = async (e) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError("");
    setDone(null);
    setPreview(null);
    if (picked.size > MAX_BYTES) return setError("That file is over 15 MB. Split it into smaller files.");
    const text = await picked.text();
    setFile({ name: picked.name, text });
    setBusy("preview");
    try {
      const res = await send(text, picked.name, true);
      setPreview(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't read that file.");
    } finally {
      setBusy("");
    }
  };

  const importNow = async () => {
    setBusy("import");
    setError("");
    try {
      const res = await send(file.text, file.name, false);
      setDone(res.data.data);
      setPreview(null);
      setFile(null);
      onImported?.();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't import that file. Try again.");
    } finally {
      setBusy("");
    }
  };

  const skipped = preview ? Object.entries(preview.skipped || {}).filter(([reason]) => !/note rows/i.test(reason)) : [];

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <span className="flex items-center gap-2">
          <LuUpload size={14} /> Import sales
        </span>
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Import your past sales</p>
          <p className="mt-1 max-w-xl text-sm text-text-muted">
            Upload a CSV of what you've sold — from any spreadsheet — and every listing shows what that item usually
            sells for. Only your store uses your sales.
          </p>
        </div>
        {compact && (
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-muted hover:text-text">
            Close
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={TEMPLATE_URL}
          download
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-text/5 transition-colors"
        >
          <LuDownload size={14} /> Download the template
        </a>
        <Button size="sm" type="button" onClick={() => inputRef.current?.click()} disabled={!!busy}>
          <span className="flex items-center gap-2">
            <LuUpload size={14} /> {busy === "preview" ? "Reading…" : "Choose a CSV file"}
          </span>
        </Button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={choose} />
      </div>

      <details className="mt-4 text-xs text-text-muted">
        <summary className="cursor-pointer hover:text-text">What goes in each column</summary>
        <ol className="mt-2 space-y-1 pl-4 list-decimal">
          {COLUMNS.map(([name, note]) => (
            <li key={name}>
              <span className="text-text">{name}</span> — {note}
            </li>
          ))}
        </ol>
        <p className="mt-2">Keep the columns in this order. The header row is skipped.</p>
      </details>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {preview && (
        <div className="mt-4 rounded-lg border border-border p-4 text-sm">
          <p className="font-medium">{file?.name}</p>
          <p className="mt-1 text-text-muted">
            {preview.sales.toLocaleString()} sales from {preview.first_sale} to {preview.last_sale}
            {" · "}
            {preview.new_sales.toLocaleString()} new
            {preview.already_saved > 0 && `, ${preview.already_saved.toLocaleString()} already saved`}
          </p>
          {skipped.length > 0 && (
            <p className="mt-1 text-text-muted">
              Skipped: {skipped.map(([reason, n]) => `${n} ${reason.toLowerCase()}`).join(", ")}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" type="button" onClick={importNow} disabled={!!busy || preview.new_sales === 0}>
              {busy === "import"
                ? "Importing…"
                : preview.new_sales === 0
                  ? "Nothing new to import"
                  : `Import ${preview.new_sales.toLocaleString()} sales`}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              disabled={!!busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {done && (
        <p className="mt-4 flex items-center gap-2 text-sm text-live">
          <LuCircleCheck size={15} /> Imported {done.new_sales.toLocaleString()} sales.
        </p>
      )}
    </div>
  );
}
