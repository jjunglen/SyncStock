import SignalDot from "../ui/SignalDot.jsx";

// The store's mark in the shopper site's headers: its logo if the
// merchant uploaded one (on a white tile, so dark and light logos both
// show in either theme), otherwise the live dot and the store name.
export default function StoreBrandMark({ name, logoUrl, subtitle }) {
  if (logoUrl) {
    return (
      <span className="flex items-center gap-2">
        <span className="flex h-9 items-center rounded-md bg-white px-2">
          <img src={logoUrl} alt={name} className="h-6 w-auto max-w-[120px] object-contain" />
        </span>
        {subtitle && <span className="text-[10px] text-text-muted leading-tight">{subtitle}</span>}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <SignalDot tone="live" size="md" />
      <span>
        <span className="font-display font-semibold text-sm">{name}</span>
        {subtitle && <span className="block text-[10px] text-text-muted -mt-0.5">{subtitle}</span>}
      </span>
    </span>
  );
}
