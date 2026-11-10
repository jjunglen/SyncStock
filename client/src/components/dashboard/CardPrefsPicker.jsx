import {
  CARD_KIND_OPTIONS,
  CARD_KINDS,
  RAW_CONDITIONS,
  SEALED_OPTIONS,
  GRADING_COMPANIES,
  BLACK_LABEL,
  gradesFor,
  isSealedOnly,
} from "../../lib/alertOptions.js";

// Trading card preferences (lib/alertOptions.js shape):
//   sealed product — Factory Sealed only, or Damaged too
//   raw cards — worst condition: NM, LP or MP
//   graded cards — the companies wanted, each with its own lowest grade
//   (Black Label for Beckett)
// mode "alert" (Track, alert edit): raw / graded / either for one card.
// mode "profile" (Your sizes): what they collect, sealed included.
//   kinds — what the store lists this card as (sealed, graded, NM…), if known

const selectClass =
  "w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-text/10";

function Segmented({ label, options, value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-1 p-1 border border-text/15 rounded-xl bg-surface-muted ${options.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-2 py-2 rounded-lg text-xs sm:text-sm leading-tight transition-colors ${
            value === o.value ? "bg-primary text-primary-text font-semibold shadow-sm" : "text-text hover:bg-text/10"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        on ? "bg-primary text-primary-text border-primary font-medium" : "border-border bg-surface hover:border-text/30"
      }`}
    >
      {children}
    </button>
  );
}

// The alert's raw / graded / either choice, from and to `kinds`
const kindChoice = (kinds) => {
  const raw = kinds.includes("raw");
  const graded = kinds.includes("graded");
  return raw && !graded ? "raw" : graded && !raw ? "graded" : "either";
};
const kindsFor = (choice) => (choice === "raw" ? ["raw", "sealed"] : choice === "graded" ? ["graded", "sealed"] : ["raw", "graded", "sealed"]);

export default function CardPrefsPicker({ value, onChange, kinds = null, mode = "alert", compact = false }) {
  const label = compact
    ? "text-xs text-text-muted block mb-1.5"
    : "text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block";
  const set = (changes) => onChange({ ...value, ...changes });

  const sealedPicker = (
    <div>
      <span className={label}>{mode === "profile" ? "Sealed product" : "Condition"}</span>
      <Segmented
        label="Sealed condition"
        options={SEALED_OPTIONS}
        value={value.sealed || ""}
        onChange={(v) => set({ sealed: v || null })}
      />
    </div>
  );
  if (mode === "alert" && isSealedOnly(kinds)) return sealedPicker;

  const grades = value.grades || {};
  const companies = Object.keys(grades);
  const toggleCompany = (company) => {
    const next = { ...grades };
    if (company in next) delete next[company];
    else next[company] = null;
    set({ grades: next });
  };
  const toggleKind = (kind) => {
    const next = value.kinds.includes(kind) ? value.kinds.filter((k) => k !== kind) : [...value.kinds, kind];
    if (next.length) set({ kinds: next });
  };

  return (
    <div className="space-y-4">
      {mode === "profile" ? (
        <div>
          <span className={label}>I collect</span>
          <div className="flex flex-wrap gap-2">
            {CARD_KINDS.map((k) => (
              <Chip key={k.value} on={value.kinds.includes(k.value)} onClick={() => toggleKind(k.value)}>
                {k.label}
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <span className={label}>Card condition</span>
          <Segmented
            label="Raw or graded"
            options={CARD_KIND_OPTIONS}
            value={kindChoice(value.kinds)}
            onChange={(v) => set({ kinds: kindsFor(v) })}
          />
        </div>
      )}

      {value.kinds.includes("raw") && (
        <label className="block">
          <span className={label}>Raw — worst condition</span>
          <select
            value={value.min_condition || ""}
            onChange={(e) => set({ min_condition: e.target.value || null })}
            className={selectClass}
          >
            <option value="">Any condition</option>
            {RAW_CONDITIONS.map((o, i) => (
              <option key={o.value} value={o.value}>
                {o.value} — {i === 0 ? `${o.label} only` : `${o.label} or better`}
              </option>
            ))}
          </select>
        </label>
      )}

      {value.kinds.includes("graded") && (
        <div>
          <span className={label}>Graded — companies</span>
          <div className="flex flex-wrap gap-2">
            {GRADING_COMPANIES.map((c) => (
              <Chip key={c.value} on={c.value in grades} onClick={() => toggleCompany(c.value)}>
                {c.label}
              </Chip>
            ))}
          </div>
          {companies.length === 0 ? (
            <p className="mt-2 text-xs text-text-muted">Any company, any grade. Pick companies to set a lowest grade for each.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {GRADING_COMPANIES.filter((c) => c.value in grades).map((c) => (
                <label key={c.value} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-sm">{c.label}</span>
                  <select
                    value={grades[c.value] || ""}
                    onChange={(e) => set({ grades: { ...grades, [c.value]: e.target.value || null } })}
                    className={selectClass}
                    aria-label={`Lowest ${c.label} grade`}
                  >
                    <option value="">Any grade</option>
                    {gradesFor(c.value).map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.value === BLACK_LABEL
                          ? "Black Label only"
                          : g.value === "10"
                            ? c.value === "BGS"
                              ? "10 or Black Label"
                              : "10 only"
                            : `${g.label} or better`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "profile" && value.kinds.includes("sealed") && sealedPicker}
    </div>
  );
}
