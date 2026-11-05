import {
  CARD_KIND_OPTIONS,
  RAW_CONDITIONS,
  SEALED_OPTIONS,
  GRADING_COMPANIES,
  BLACK_LABEL,
  gradesFor,
  isSealedOnly,
} from "../../lib/alertOptions.js";

// A trading card alert's preferences (Track a new item and the alert's
// edit form):
//   sealed product — Factory Sealed only, or Damaged too
//   raw cards — worst condition: NM, LP or MP
//   graded cards — grading company, then its lowest grade (Black Label
//   for Beckett)
//   value — { graded_preference, min_condition, preferred_grading_company, min_grade, sealed }
//   kinds — what the store lists this card as (sealed, graded, NM…), if known

const selectClass =
  "w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-text/10 disabled:opacity-50";

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

export default function CardPrefsPicker({ value, onChange, kinds = null, compact = false }) {
  const label = compact
    ? "text-xs text-text-muted block mb-1.5"
    : "text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block";

  if (isSealedOnly(kinds)) {
    return (
      <div>
        <span className={label}>Condition</span>
        <Segmented
          label="Sealed condition"
          options={SEALED_OPTIONS}
          value={value.sealed || ""}
          onChange={(v) => onChange({ ...value, sealed: v || null })}
        />
      </div>
    );
  }

  const kind = value.graded_preference || "either";
  const company = value.preferred_grading_company || "";

  const setCompany = (next) => {
    // A grade only stays if the new company has it (Black Label is Beckett's)
    const keep = value.min_grade && gradesFor(next).some((g) => g.value === value.min_grade);
    onChange({ ...value, preferred_grading_company: next || null, min_grade: next && keep ? value.min_grade : null });
  };

  return (
    <div className="space-y-4">
      <div>
        <span className={label}>Card condition</span>
        <Segmented
          label="Raw or graded"
          options={CARD_KIND_OPTIONS}
          value={kind}
          onChange={(v) => onChange({ ...value, graded_preference: v })}
        />
      </div>

      {kind !== "graded" && (
        <label className="block">
          <span className={label}>Raw condition</span>
          <select
            value={value.min_condition || ""}
            onChange={(e) => onChange({ ...value, min_condition: e.target.value || null })}
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

      {kind !== "raw" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>Grading company</span>
            <select value={company} onChange={(e) => setCompany(e.target.value)} className={selectClass}>
              <option value="">Any company</option>
              {GRADING_COMPANIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Grade</span>
            <select
              value={value.min_grade || ""}
              onChange={(e) => onChange({ ...value, min_grade: e.target.value || null })}
              disabled={!company}
              className={selectClass}
            >
              <option value="">{company ? "Any grade" : "Pick a company first"}</option>
              {company &&
                gradesFor(company).map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.value === BLACK_LABEL ? "Black Label" : g.value === "10" ? (company === "BGS" ? "10 or Black Label" : "10 only") : `${g.label} or better`}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
