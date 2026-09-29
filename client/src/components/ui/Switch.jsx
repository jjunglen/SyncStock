// On/off switch. `label` names it for screen readers when there's no
// visible text next to it.
export default function Switch({ checked, onChange, disabled, label, size = "md" }) {
  const small = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${small ? "h-5 w-9" : "h-6 w-11"} ${checked ? "bg-live" : "bg-text/15"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform ${small ? "h-4 w-4" : "h-5 w-5"} ${checked ? (small ? "translate-x-4" : "translate-x-5") : ""}`}
      />
    </button>
  );
}
