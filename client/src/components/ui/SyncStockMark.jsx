// The SyncStock logo (public/brand/syncstock-mark*.png): the mirrored SS
// with the green dot, on a transparent background. White letters for dark
// backgrounds; the "dark" file has black letters for light ones. The image
// is cropped so the letters (not the dot) sit in its vertical middle, so
// they line up with the text beside them.
const MARK_RATIO = 344 / 328; // width / height of the image files

export default function SyncStockMark({ size = 24, className = "", title, onLight = false }) {
  return (
    <img
      src={onLight ? "/brand/syncstock-mark-dark.png" : "/brand/syncstock-mark.png"}
      alt={title || ""}
      aria-hidden={title ? undefined : true}
      height={size}
      width={Math.round(size * MARK_RATIO)}
      className={`shrink-0 select-none ${className}`}
      draggable={false}
    />
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
