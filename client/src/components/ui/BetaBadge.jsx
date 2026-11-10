// The "Beta" tag on new features (Sell your items, Buy requests, Trading
// cards). A bright green with its own shade in light and dark mode
// (App.css --color-beta).
//   size — "xs" (sidebar) | "sm" (page titles)
export default function BetaBadge({ size = "sm", className = "" }) {
  const sizing = size === "xs" ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]";
  return <span className={`rounded-full bg-beta-soft font-semibold text-beta ${sizing} ${className}`}>Beta</span>;
}
