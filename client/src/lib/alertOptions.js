// Choices for an alert's "new or pre-owned" setting
// (Alert.condition_preference on the server)
export const CONDITION_OPTIONS = [
  { value: "either", label: "Brand New or Pre-Owned" },
  { value: "brand_new", label: "Brand New only" },
  { value: "pre_owned", label: "Pre-Owned only" },
];

export const conditionLabel = (value) =>
  CONDITION_OPTIONS.find((o) => o.value === value)?.label || CONDITION_OPTIONS[0].label;

// Trading cards (server utils/cardDetails.js)
// Raw conditions shoppers pick, best first (HP/DMG listings show too)
export const RAW_CONDITIONS = [
  { value: "NM", label: "Near Mint" },
  { value: "LP", label: "Lightly Played" },
  { value: "MP", label: "Moderately Played" },
];
const MORE_RAW = { HP: "Heavily Played", DMG: "Damaged" };

export const CARD_KIND_OPTIONS = [
  { value: "either", label: "Raw or graded" },
  { value: "raw", label: "Raw only" },
  { value: "graded", label: "Graded only" },
];

// Sealed product: factory sealed only, or damaged boxes too
export const SEALED_OPTIONS = [
  { value: "", label: "Factory Sealed or Damaged" },
  { value: "factory", label: "Factory Sealed only" },
];

// Grading companies shoppers pick; BGS is shown as Beckett, "Other" is
// any other company (SGC, TAG, ACE…)
export const GRADING_COMPANIES = [
  { value: "PSA", label: "PSA" },
  { value: "CGC", label: "CGC" },
  { value: "BGS", label: "Beckett" },
  { value: "OTHER", label: "Other" },
];
export const companyLabel = (value) => GRADING_COMPANIES.find((c) => c.value === value)?.label || value;

// Lowest grades, best first. Black Label (above a 10) is Beckett only.
export const BLACK_LABEL = "BL";
export const gradesFor = (company) => [
  ...(company === "BGS" ? [{ value: BLACK_LABEL, label: "Black Label" }] : []),
  ...["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"].map((g) => ({ value: g, label: g })),
];
const gradeLabel = (grade) => (grade === BLACK_LABEL ? "Black Label" : grade);

// An item's condition badge: "Brand New", "Factory Sealed", "Near Mint",
// "PSA 10", "Beckett Black Label"
export const itemConditionLabel = (item) => {
  const c = item?.condition;
  if (c === "brand_new") return "Brand New";
  if (c === "pre_owned") return "Pre-Owned";
  if (c === "sealed") return "Factory Sealed";
  if (c === "sealed_damaged") return "Sealed · Damaged";
  if (c === "graded") {
    return [item.grading_company && companyLabel(item.grading_company), item.grade && gradeLabel(item.grade)].filter(Boolean).join(" ") || "Graded";
  }
  return RAW_CONDITIONS.find((o) => o.value === c)?.label || MORE_RAW[c] || null;
};

// A card alert's preferences in words: "Graded only · PSA 9 or better"
export const cardPrefsLabel = (alert) => {
  if (alert.attributes?.card_type === "sealed" || alert.attributes?.sealed) {
    return alert.attributes?.sealed === "factory" ? "Factory Sealed only" : "Factory Sealed or Damaged";
  }
  const kind = alert.graded_preference || "either";
  const parts = [CARD_KIND_OPTIONS.find((o) => o.value === kind)?.label || "Raw or graded"];
  const worst = alert.attributes?.min_condition;
  if (worst && kind !== "graded") {
    const label = RAW_CONDITIONS.find((o) => o.value === worst)?.label;
    parts.push(worst === "NM" ? `${label} only` : `${label} or better`);
  }
  if (kind !== "raw" && alert.preferred_grading_company) {
    const grade = alert.min_grade;
    const g = !grade ? "" : grade === BLACK_LABEL ? " Black Label" : grade === "10" ? " 10" : ` ${grade} or better`;
    parts.push(`${companyLabel(alert.preferred_grading_company)}${g}`);
  }
  return parts.join(" · ");
};

// A card alert's preferences, as CardPrefsPicker edits them
export const EMPTY_CARD_PREFS = {
  graded_preference: "either",
  min_condition: null,
  preferred_grading_company: null,
  min_grade: null,
  sealed: null,
};

export const cardPrefsOf = (alert) => ({
  graded_preference: alert.graded_preference || "either",
  min_condition: alert.attributes?.min_condition || null,
  preferred_grading_company: alert.preferred_grading_company || null,
  min_grade: alert.min_grade || null,
  sealed: alert.attributes?.sealed || null,
});

// Sealed product (boxes, packs) only — the sealed choice instead of raw/graded
export const isSealedOnly = (kinds) =>
  Array.isArray(kinds) && kinds.length > 0 && kinds.every((k) => k === "sealed" || k === "sealed_damaged");
