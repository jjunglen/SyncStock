import { useState } from "react";
import SignalDot from "../ui/SignalDot.jsx";

// The store's mark in the shopper site's headers: its logo if the
// merchant uploaded one (on a white tile, so dark and light logos both
// show in either theme), otherwise the live dot and the store name. If the
// logo can't load, it falls back to the name instead of a broken image.
export default function StoreBrandMark({ name, logoUrl, subtitle }) {
  const [failedUrl, setFailedUrl] = useState(null);

  if (logoUrl && failedUrl !== logoUrl) {
    return (
      <span className="flex items-center gap-2">
        <span className="flex h-12 items-center rounded-lg bg-white px-2">
          <img
            src={logoUrl}
            alt={name}
            onError={() => setFailedUrl(logoUrl)}
            className="h-10 w-auto max-w-[180px] object-contain"
          />
        </span>
        {subtitle && <span className="text-[10px] text-text-muted leading-tight whitespace-nowrap">{subtitle}</span>}
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
