// The trading-card condition filter (?card=, read by the server's
// inventory filters): only kinds the store actually has in stock, from
// the categories endpoint's card_kinds { sealed, raw, graded, companies }.
// Returns null when there's nothing to choose between.
const COMPANY_LABELS = { PSA: "PSA", BGS: "Beckett (BGS)", CGC: "CGC", OTHER: "other companies" };

export const cardFilterOptions = (kinds) => {
  if (!kinds) return null;
  const options = [{ value: "", label: "Any condition" }];
  if (kinds.sealed > 0) options.push({ value: "sealed", label: "Sealed" });
  if (kinds.raw > 0) {
    options.push(
      { value: "raw", label: "Raw (ungraded)" },
      { value: "raw_NM", label: "Raw: Near Mint" },
      { value: "raw_LP", label: "Raw: Lightly Played or better" },
      { value: "raw_MP", label: "Raw: Moderately Played or better" },
    );
  }
  if (kinds.graded > 0) {
    options.push({ value: "graded", label: "Graded (any)" });
    for (const company of ["PSA", "BGS", "CGC", "OTHER"]) {
      if (kinds.companies?.[company] > 0) options.push({ value: `graded_${company}`, label: `Graded: ${COMPANY_LABELS[company]}` });
    }
  }
  // Only sealed, say: nothing to narrow down
  return options.length > 2 ? options : null;
};
