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

// ---- Card preferences ------------------------------------------------------
// One shape for a shopper's saved card preferences (Profile → Your sizes)
// and each card alert (server utils/cardDetails.js):
//   { kinds: ["raw", "graded", "sealed"], min_condition: "LP" | null,
//     grades: { PSA: "9", BGS: "BL", OTHER: null }, sealed: "factory" | null }
// grades {} = any company, any grade; a company's null = any grade.
export const CARD_KINDS = [
  { value: "raw", label: "Raw" },
  { value: "graded", label: "Graded" },
  { value: "sealed", label: "Sealed" },
];

export const EMPTY_CARD_PREFS = { kinds: ["raw", "graded", "sealed"], min_condition: null, grades: {}, sealed: null };

// Saved preferences, or null when the shopper hasn't set any
export const savedCardPrefs = (account) => (account?.card_prefs?.kinds ? { ...EMPTY_CARD_PREFS, ...account.card_prefs } : null);

// An alert's preferences (older alerts kept one company and grade)
export const cardPrefsOf = (alert) => {
  const a = alert.attributes || {};
  const want = alert.graded_preference || "either";
  const kinds = a.kinds || [...(want !== "graded" ? ["raw"] : []), ...(want !== "raw" ? ["graded"] : []), "sealed"];
  const grades = a.grades || (alert.preferred_grading_company ? { [alert.preferred_grading_company]: alert.min_grade || null } : {});
  return { kinds, min_condition: a.min_condition || null, grades, sealed: a.sealed || null };
};

const gradeText = (grade) => (!grade ? "" : grade === BLACK_LABEL ? " Black Label" : grade === "10" ? " 10" : ` ${grade}+`);

// Preferences in words: "Raw LP+ · PSA 9+ · Beckett Black Label"
export const cardPrefsSummary = (prefs, { sealedOnly = false } = {}) => {
  if (sealedOnly) return prefs.sealed === "factory" ? "Factory Sealed only" : "Factory Sealed or Damaged";
  const parts = [];
  if (prefs.kinds.includes("raw")) {
    const worst = RAW_CONDITIONS.find((o) => o.value === prefs.min_condition);
    parts.push(!worst ? "Raw, any condition" : prefs.min_condition === "NM" ? "Raw NM only" : `Raw ${worst.value}+`);
  }
  if (prefs.kinds.includes("graded")) {
    const companies = Object.entries(prefs.grades || {});
    if (!companies.length) parts.push("Graded, any company");
    else for (const [c, g] of companies) parts.push(`${companyLabel(c)}${gradeText(g)}`);
  }
  if (prefs.kinds.includes("sealed") && parts.length === 0) parts.push(prefs.sealed === "factory" ? "Factory Sealed only" : "Sealed");
  return parts.join(" · ");
};

// A card alert's preferences in words (Your alerts)
export const cardPrefsLabel = (alert) =>
  cardPrefsSummary(cardPrefsOf(alert), { sealedOnly: alert.attributes?.card_type === "sealed" });

// Sealed product (boxes, packs) only — the sealed choice instead of raw/graded
export const isSealedOnly = (kinds) =>
  Array.isArray(kinds) && kinds.length > 0 && kinds.every((k) => k === "sealed" || k === "sealed_damaged");
