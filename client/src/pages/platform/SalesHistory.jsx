import { useCallback, useEffect, useRef, useState } from "react";
import { LuUpload, LuFileSpreadsheet } from "react-icons/lu";
import api from "../../lib/api.js";
import PriceGuide from "../../components/dashboard/PriceGuide.jsx";

// The Lab's sales history on the admin page: upload the "All Items Sold"
// sheet (CSV — preview first, then import; sales already saved are
// skipped), and look up a price guide by style code or name.

const money = (n) => (n === null || n === undefined ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
const count = (n) => Number(n || 0).toLocaleString();
const date = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
const CHANNELS = { in_store: "In store", ebay: "eBay", website: "Website", goat: "GOAT", stockx: "StockX", other: "Other" };

const Panel = ({ title, hint, children }) => (
  <section className="rounded-xl border border-border bg-surface p-4 sm:p-5 min-w-0">
    <h3 className="font-semibold">{title}</h3>
    {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

function ImportResult({ result }) {
  const skipped = Object.entries(result.skipped || {});
  return (
    <div className="mt-4 rounded-lg border border-border p-3 text-sm space-y-2">
      <p>
        <span className="font-semibold">{count(result.sales)}</span> sales in {result.file} · {date(result.first_sale)} to {date(result.last_sale)}
      </p>
      <p>
        <span className="font-semibold text-live">{count(result.new_sales)} new</span>
        {result.already_saved > 0 && <span className="text-text-muted"> · {count(result.already_saved)} already saved (skipped)</span>}
      </p>
      <p className="text-text-muted">
        {count(result.by_condition?.new)} new · {count(result.by_condition?.used)} used ·{" "}
        {Object.entries(result.by_channel || {})
          .map(([k, v]) => `${CHANNELS[k] || k} ${count(v)}`)
          .join(" · ")}
      </p>
      {result.matching && (
        <p className="text-text-muted">
          Matching: {count(result.matching.fixed_sku)} SKU typos fixed · {count(result.matching.borrowed_sku)} SKUs borrowed from the same title ·{" "}
          {count(result.matching.title)} matched by name · {count(result.matching.too_general)} too general to price
        </p>
      )}
      {skipped.length > 0 && (
        <p className="text-text-muted">Left out: {skipped.map(([k, v]) => `${k} (${count(v)})`).join(", ")}</p>
      )}
      {result.flagged_count > 0 && (
        <div className="text-warn">
          <p>{count(result.flagged_count)} flagged (saved, but not used for prices):</p>
          <ul className="list-disc pl-5">
            {result.flagged.map((f, i) => (
              <li key={i}>
                {f.name} {f.size && `· ${f.size}`} · {money(f.sale_price)} (cost {money(f.cost)}) — {f.flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Upload({ store, onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const send = (dryRun) =>
    api.post("/platform/sales/import", text, {
      params: { store, file: file.name, ...(dryRun && { dry_run: "1" }) },
      headers: { "Content-Type": "text/csv" },
    });

  const choose = async (e) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError("");
    setPreview(null);
    setDone(null);
    setFile(picked);
    setBusy("preview");
    try {
      const content = await picked.text();
      setText(content);
      const res = await api.post("/platform/sales/import", content, {
        params: { store, file: picked.name, dry_run: "1" },
        headers: { "Content-Type": "text/csv" },
      });
      setPreview(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't read that file.");
    } finally {
      setBusy("");
    }
  };

  const confirm = async () => {
    setBusy("import");
    setError("");
    try {
      const res = await send(false);
      setDone(res.data.data);
      setPreview(null);
      onImported?.();
    } catch (err) {
      setError(err.response?.data?.message || "Import failed. Try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Panel title="Upload sales" hint="The All Items Sold sheet, downloaded as CSV. Sales already saved are skipped, so overlapping files are fine.">
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={choose} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={!!busy}
        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:border-text/30 disabled:opacity-50"
      >
        <LuUpload size={16} /> {busy === "preview" ? "Reading..." : "Choose CSV"}
      </button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {preview && (
        <>
          <ImportResult result={preview} />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={!!busy || preview.new_sales === 0}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text disabled:opacity-50"
            >
              {busy === "import" ? "Importing..." : preview.new_sales === 0 ? "Nothing new to import" : `Import ${count(preview.new_sales)} sales`}
            </button>
            <button type="button" onClick={() => setPreview(null)} disabled={!!busy} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:text-text">
              Cancel
            </button>
          </div>
        </>
      )}
      {done && (
        <p className="mt-4 text-sm text-live">
          Imported {count(done.new_sales)} sales from {done.file}.
        </p>
      )}
    </Panel>
  );
}

export default function SalesHistory({ stores = [] }) {
  const [store, setStore] = useState(() => (stores.find((s) => s.subdomain === "laboratory") || stores[0])?.subdomain || "");
  const [totals, setTotals] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (!store) return;
    api
      .get("/platform/sales", { params: { store } })
      .then((res) => {
        setTotals(res.data.data);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [store]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <LuFileSpreadsheet size={18} /> Sales history
          </h2>
          <p className="text-xs text-text-muted">
            {failed
              ? "Couldn't load sales history."
              : !totals
                ? "Loading..."
                : totals.sales === 0
                  ? "No sales uploaded for this store yet."
                  : `${count(totals.sales)} sales (${count(totals.new_sales)} new · ${count(totals.used_sales)} used) · ${count(totals.style_codes)} style codes · ${date(totals.first_sale)} to ${date(totals.last_sale)}`}
          </p>
        </div>
        <label className="text-sm">
          <span className="text-text-muted mr-2">Store</span>
          <select
            value={store}
            onChange={(e) => {
              setTotals(null);
              setStore(e.target.value);
            }}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.subdomain}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0">
          <Upload key={store} store={store} onImported={load} />
          {totals?.files?.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm">
              <p className="font-semibold mb-2">Uploads</p>
              <ul className="space-y-1">
                {totals.files.map((f) => (
                  <li key={f.source_file || "none"} className="flex justify-between gap-2">
                    <span className="truncate">{f.source_file || "—"}</span>
                    <span className="text-text-muted shrink-0">{count(f.sales)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="lg:col-span-2 min-w-0">
          <Panel title="Price guide" hint="This store's sales: SKU → brand new / pre-owned → size, at the store's margins.">
            <PriceGuide key={store} endpoint="/platform/sales/lookup" params={{ store }} disabled={!store} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
