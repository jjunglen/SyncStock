import { useEffect, useRef, useState } from "react";
import { LuRuler, LuCircleCheck, LuCheck, LuX, LuRefreshCw, LuUpload, LuArrowUp, LuArrowDown, LuArrowDownUp } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";

// /size-settings — the "other" category (everything that isn't shoes,
// clothing or cards): its name, which Shopify options are sizes, and the
// size chart shoppers pick from in their profile and on Track (server:
// sizeSettings.controller.js, utils/otherSizes.js).

const sizeKey = (s) => String(s ?? "").toLowerCase().replace(/size/g, "").replace(/\s+/g, "").replace(/cm$/, "");

// Adds sizes to a list, skipping blanks and repeats ("158cm" = "158")
const addSizes = (list, more, max) => {
  const out = [...list];
  const keys = new Set(out.map(sizeKey));
  for (const raw of more) {
    const size = String(raw ?? "").replace(/\s+/g, " ").trim();
    const key = sizeKey(size);
    if (!key || keys.has(key) || out.length >= max) continue;
    keys.add(key);
    out.push(size);
  }
  return out;
};

// "148, 152; 155" or one per line (a CSV's first column)
const splitSizes = (text) =>
  String(text || "")
    .split(/[\n\r,;\t]+/)
    .map((s) => s.replace(/^"|"$/g, "").trim())
    .filter(Boolean);

// "7 3/8" → 7.375, "158cm" → 158, "M" → NaN
const sizeNumber = (size) => {
  const m = /^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?/.exec(String(size).trim());
  if (!m) return NaN;
  return Number(m[1]) + (m[2] ? Number(m[2]) / Number(m[3]) : 0);
};

// Numbers by value (7 1/8 before 7 1/4), then everything else as written
const byValue = (a, b) => {
  const na = sizeNumber(a);
  const nb = sizeNumber(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
};

function Section({ step, title, description, children }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 mb-5">
      <div className="flex items-start gap-3 mb-4">
        {step && (
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">
            {step}
          </span>
        )}
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function SizeSettings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState("");
  // Editable copies
  const [name, setName] = useState("");
  const [optionNames, setOptionNames] = useState([]);
  const [label, setLabel] = useState("");
  const [sizes, setSizes] = useState([]);
  const [adding, setAdding] = useState("");
  // An option that looks like colors, waiting for "Use it anyway"
  const [colorWarning, setColorWarning] = useState(null);
  const fileRef = useRef(null);
  const savedTimer = useRef(null);

  const apply = (d) => {
    setData((prev) => ({ ...prev, ...d }));
    setName(d.other_category_name || "");
    setOptionNames(d.option_names || []);
    setLabel(d.label || "");
    setSizes(d.sizes || []);
  };

  useEffect(() => {
    api
      .get("/store/size-settings")
      .then((res) => apply(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load size settings"));
    return () => clearTimeout(savedTimer.current);
  }, []);

  const save = async (what, body, message) => {
    setBusy(what);
    setError("");
    try {
      const res = await api.put("/store/size-settings", body);
      apply(res.data.data);
      setSaved(res.data.data.resyncing ? `${message} — updating your products' sizes` : message);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save. Try again.");
    } finally {
      setBusy("");
    }
  };

  if (!data && !error) {
    return (
      <div className="flex min-h-screen w-full bg-bg text-text">
        <MerchantSidebar />
        <div className="flex-1 p-6"><Spinner size={20} /></div>
      </div>
    );
  }

  const limits = data?.limits || { name: 30, label: 30, sizes: 100, size: 20 };
  const categoryName = name.trim() || "Other";
  const options = data?.options || [];
  const chosen = new Set(optionNames.map((n) => n.toLowerCase()));
  // Until the merchant picks, the options SyncStock detected as sizes
  const isChosen = (o) => (optionNames.length ? chosen.has(o.name.toLowerCase()) : o.detected === "size");
  // One Save for the whole page: only what changed is sent
  const nameChanged = name.trim() !== (data?.other_category_name || "");
  const sizesChanged =
    JSON.stringify(sizes) !== JSON.stringify(data?.sizes || []) || (label.trim() || null) !== (data?.label || null);
  const optionsChanged = JSON.stringify(optionNames) !== JSON.stringify(data?.option_names || []);
  const dirty = nameChanged || sizesChanged || optionsChanged;

  const saveAll = () => {
    if (!dirty || busy) return;
    save(
      "all",
      {
        ...(nameChanged && { other_category_name: name }),
        ...(optionsChanged && { option_names: optionNames }),
        ...(sizesChanged && { sizes, label }),
      },
      "Saved",
    );
  };

  const toggleOption = (o, { confirmed = false } = {}) => {
    const on = isChosen(o);
    // Ticking colors as sizes is almost always a mistake — ask first
    if (!on && o.detected === "color" && !confirmed) {
      setColorWarning(o);
      return;
    }
    setColorWarning(null);
    // First change: start from what's shown (the detected size options)
    const base = optionNames.length ? optionNames : options.filter((x) => x.detected === "size").map((x) => x.name);
    setOptionNames(on ? base.filter((n) => n.toLowerCase() !== o.name.toLowerCase()) : [...base, o.name]);
  };

  const fillFromProducts = () => {
    const values = options.filter(isChosen).flatMap((o) => o.values);
    setSizes((list) => addSizes(list, values, limits.sizes));
  };

  const addTyped = (e) => {
    e.preventDefault();
    setSizes((list) => addSizes(list, splitSizes(adding), limits.sizes));
    setAdding("");
  };

  const uploadCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const lines = (await file.text()).split(/\r?\n/).map((line) => line.split(",")[0]);
    // A header row ("Size", "Length") isn't a size
    const values = splitSizes(lines.join("\n")).filter((v, i) => !(i === 0 && /^[a-z ()]+$/i.test(v) && !/^(xs|s|m|l|xl|xxl|os)$/i.test(v)));
    setSizes((list) => addSizes(list, values, limits.sizes));
  };

  const move = (i, step) =>
    setSizes((list) => {
      const j = i + step;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar />
      <div className="flex-1 p-6 overflow-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LuRuler size={18} className="text-text" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Size settings</h1>
          {saved && (
            <span className="ml-auto text-xs text-live flex items-center gap-1">
              <LuCircleCheck size={13} /> {saved}
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted mb-6">
          Sneakers and clothing use standard sizes. Everything else you sell goes under one category you name here,
          with your own sizes — board lengths, ring sizes, waist sizes. Shoppers save these sizes and get alerts in them.
        </p>
        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        <Section title="Category name" description="What shoppers see on your store site. Leave blank for “Other”.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveAll();
            }}
          >
            <input
              type="text"
              value={name}
              maxLength={limits.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Snowboards, Jewelry, Home goods"
              aria-label="Category name"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm placeholder:text-text-muted focus:border-text/30 focus:outline-none"
            />
          </form>
          <p className="text-xs text-text-muted mt-2">
            {data?.products || 0} of your products are in {categoryName} right now.
          </p>
        </Section>

        <Section
          step="1"
          title="Which option is the size?"
          description="The options your products use in Shopify. SyncStock picks out the sizes on its own — Length, Ring size, 152 / 158, S / M / L — and never reads colors as sizes. Change the ticks only if it got one wrong."
        >
          {options.length === 0 ? (
            <p className="text-sm text-text-muted">
              None of your {categoryName} products have options yet. Products with one variant don't need a size.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {options.map((o) => {
                const on = isChosen(o);
                return (
                  <button
                    key={o.name}
                    type="button"
                    onClick={() => toggleOption(o)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      on ? "border-primary bg-primary/10 text-text" : "border-border text-text-muted hover:text-text"
                    }`}
                  >
                    {on && <LuCheck size={14} aria-hidden="true" />}
                    {o.name}
                    <span className="text-xs text-text-muted">
                      {o.products} product{o.products === 1 ? "" : "s"}
                      {o.detected === "color" && " · color"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {!colorWarning && options.some((o) => isChosen(o) && o.detected === "color") && (
            <p className="mt-3 text-xs text-warn">
              {options
                .filter((o) => isChosen(o) && o.detected === "color")
                .map((o) => `“${o.name}”`)
                .join(", ")}{" "}
              looks like colors but is ticked as a size — untick it unless that's what you want.
            </p>
          )}
          {colorWarning && (
            <div role="alert" className="mt-4 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
              <p className="font-medium text-warn">“{colorWarning.name}” looks like colors, not sizes</p>
              <p className="mt-1 text-text-muted">
                Its values are {colorWarning.values.slice(0, 4).join(", ")}
                {colorWarning.values.length > 4 ? "…" : ""}. Shoppers would pick these as sizes, and size alerts would
                match on them.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setColorWarning(null)}>
                  Keep it off
                </Button>
                <Button size="sm" variant="secondary" onClick={() => toggleOption(colorWarning, { confirmed: true })}>
                  Use it anyway
                </Button>
              </div>
            </div>
          )}
          {options.length > 0 && (
            <p className="mt-4 text-xs text-text-muted">
              {optionNames.length ? "Your picks are used instead of the automatic ones." : "Automatic until you change a tick."}{" "}
              Saving a change here re-reads your products' sizes (about a minute).
            </p>
          )}
        </Section>

        <Section
          step="2"
          title="Your sizes"
          description="The sizes shoppers can pick, in this order. Add sizes you don't stock yet too — “158”, “158cm” and “158 cm” count as the same size."
        >
          <label className="block mb-4">
            <span className="mb-1 block text-xs text-text-muted">Size label (optional)</span>
            <input
              type="text"
              value={label}
              maxLength={limits.label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Length (cm), Ring size, Waist"
              className="w-full max-w-xs rounded-lg border border-border bg-bg px-3 py-2 text-sm placeholder:text-text-muted focus:border-text/30 focus:outline-none"
            />
          </label>

          {data?.automatic && sizes.length > 0 && (
            <p className="mb-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-text-muted">
              Built automatically from your products, so shoppers can pick sizes already. Edit and save to make it your
              own — new sizes you stock will then only show once you add them here.
            </p>
          )}
          {sizes.length === 0 ? (
            <p className="text-sm text-text-muted mb-4">
              No sizes yet. Once your products have a size option, they show here automatically — or add them below.
            </p>
          ) : (
            <ul className="mb-4 flex flex-wrap gap-2">
              {sizes.map((size, i) => (
                <li
                  key={sizeKey(size)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-bg pl-3 pr-1 py-1 text-sm"
                >
                  {size}
                  <button type="button" onClick={() => move(i, -1)} aria-label={`Move ${size} earlier`} className="p-1 text-text-muted hover:text-text">
                    <LuArrowUp size={12} className="-rotate-90" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label={`Move ${size} later`} className="p-1 text-text-muted hover:text-text">
                    <LuArrowDown size={12} className="-rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizes((list) => list.filter((_, j) => j !== i))}
                    aria-label={`Remove ${size}`}
                    className="p-1 text-text-muted hover:text-danger"
                  >
                    <LuX size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <Button type="button" size="sm" variant="secondary" onClick={fillFromProducts} disabled={!options.some(isChosen)}>
              <span className="flex items-center gap-2"><LuRefreshCw size={14} /> Fill from my products</span>
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              <span className="flex items-center gap-2"><LuUpload size={14} /> Upload CSV</span>
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setSizes((list) => [...list].sort(byValue))} disabled={sizes.length < 2}>
              <span className="flex items-center gap-2"><LuArrowDownUp size={14} /> Sort</span>
            </Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={uploadCsv} />
          </div>
          <form onSubmit={addTyped} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="Add sizes: 145, 150, 168"
              aria-label="Add sizes"
              className="flex-1 min-w-48 rounded-lg border border-border bg-bg px-3 py-2 text-sm placeholder:text-text-muted focus:border-text/30 focus:outline-none"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={!adding.trim()}>Add</Button>
          </form>
          <p className="text-xs text-text-muted mt-2">CSV: one size per row (the first column is used).</p>

        </Section>

        {/* One Save for everything on the page */}
        <div className="sticky bottom-0 -mx-6 mt-2 flex items-center justify-between gap-3 border-t border-border bg-bg/95 px-6 py-3 backdrop-blur">
          <span className={`text-sm ${dirty ? "text-warn" : "text-text-muted"}`}>
            {dirty ? (
              "You have unsaved changes"
            ) : (
              <span className="inline-flex items-center gap-1.5 text-live">
                <LuCheck size={14} aria-hidden="true" /> All changes saved
              </span>
            )}
          </span>
          <div className="flex gap-2">
            {dirty && (
              <Button variant="secondary" size="sm" onClick={() => apply(data)} disabled={!!busy}>
                Discard
              </Button>
            )}
            <Button size="sm" onClick={saveAll} disabled={!dirty || !!busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
