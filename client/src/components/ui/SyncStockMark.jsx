// The SyncStock logo: two mirrored S's joined at the top, with the green
// "live" dot above. The S's use the text color, so the mark is white in
// dark mode and black in light mode. Same shape as public/brand/*.svg.
const S_PATH = "M13.9 -24 A16 16 0 1 0 0 0 A16 16 0 1 1 -13.9 24";

export default function SyncStockMark({ size = 24, className = "", title }) {
  return (
    // Centered on the S's (y = 0), not on the S's plus the dot — so the
    // letters line up with the middle of the text beside them
    <svg
      viewBox="-44 -50 88 100"
      height={size}
      width={(size * 88) / 100}
      className={`shrink-0 ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round">
        <path d={S_PATH} transform="translate(-19 0)" />
        <path d={S_PATH} transform="translate(19 0) scale(-1 1)" />
      </g>
      <circle cx="0" cy="-43" r="6" className="fill-live" />
    </svg>
  );
}

// The mark with the name beside it — headers and footers
export function SyncStockLogo({ size = 24, className = "" }) {
  return (
    <span className={`flex items-center gap-2 text-text ${className}`}>
      <SyncStockMark size={size} />
      <span className="font-display font-semibold text-sm tracking-tight">Syncstock</span>
    </span>
  );
}
