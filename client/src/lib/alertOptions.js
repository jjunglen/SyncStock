// Choices for an alert's "new or pre-owned" setting
// (Alert.condition_preference on the server)
export const CONDITION_OPTIONS = [
  { value: "either", label: "Brand New or Pre-Owned" },
  { value: "brand_new", label: "Brand New only" },
  { value: "pre_owned", label: "Pre-Owned only" },
];

export const conditionLabel = (value) =>
  CONDITION_OPTIONS.find((o) => o.value === value)?.label || CONDITION_OPTIONS[0].label;
