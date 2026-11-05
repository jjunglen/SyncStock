import { useId, useSyncExternalStore } from "react";

// A dark, rounded button with a light sweeping around its border (used for
// "Sell your items" in the store navbar). Each instance writes its own
// scoped CSS; motion stops for people who ask for reduced motion.
//   accentColor / accentSoftColor — the sweep and hover glow (the store's
//   brand color on store sites)
//   badge — small text after the label ("Beta"), in badgeColor
//   fillColor / insetColor — can be CSS variables, so the button follows
//   light and dark mode
//   padding / fontSize — sizing (the navbar uses a compact version)

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && (window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false);

const subscribeToReducedMotion = (callback) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const list = window.matchMedia(REDUCED_MOTION_QUERY);
  list.addEventListener?.("change", callback);
  return () => list.removeEventListener?.("change", callback);
};

export default function ShinyButton({
  label = "Get started",
  onClick,
  className = "",
  fillColor = "#000000",
  labelColor = "#ffffff",
  accentColor = "#ff5f00",
  accentSoftColor = "#ff9253",
  sweepDuration = 3,
  easeDuration = 0.8,
  arcWidth = 5,
  cornerRadius = 32,
  showSpeckle = true,
  showSheen = true,
  speckleOpacity = 0.4,
  padding = "1.25rem 2.5rem",
  fontSize = "1.125rem",
  badge = null,
  insetColor = "#1a1818",
  badgeColor = "#3b82f6",
  badgeTextColor = "#ffffff",
}) {
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion, () => false);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const scope = `gleam-edge-${id}`;

  const css = `
    @property --gradient-angle-${id} { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
    @property --gradient-angle-offset-${id} { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
    @property --gradient-percent-${id} { syntax: "<percentage>"; initial-value: ${arcWidth}%; inherits: false; }
    @property --gradient-shine-${id} { syntax: "<color>"; initial-value: white; inherits: false; }

    .${scope} {
      --gleam-base: ${fillColor};
      --gleam-inset: ${insetColor};
      --gleam-label: ${labelColor};
      --gleam-accent: ${accentColor};
      --gleam-accent-soft: ${accentSoftColor};
      --animation: gradient-angle-${id} linear infinite;
      --duration: ${sweepDuration}s;
      --shadow-size: 2px;
      --transition: ${easeDuration}s cubic-bezier(0.25, 1, 0.5, 1);
      isolation: isolate;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      outline-offset: 4px;
      padding: ${padding};
      font-size: ${fontSize};
      line-height: 1.2;
      font-weight: 500;
      white-space: nowrap;
      border: 1px solid transparent;
      border-radius: ${cornerRadius}px;
      color: var(--gleam-label);
      background:
        linear-gradient(var(--gleam-base), var(--gleam-base)) padding-box,
        conic-gradient(
          from calc(var(--gradient-angle-${id}) - var(--gradient-angle-offset-${id})),
          transparent,
          var(--gleam-accent) var(--gradient-percent-${id}),
          var(--gradient-shine-${id}) calc(var(--gradient-percent-${id}) * 2),
          var(--gleam-accent) calc(var(--gradient-percent-${id}) * 3),
          transparent calc(var(--gradient-percent-${id}) * 4)
        ) border-box;
      box-shadow: inset 0 0 0 1px var(--gleam-inset);
      transition: var(--transition);
      transition-property: --gradient-angle-offset-${id}, --gradient-percent-${id}, --gradient-shine-${id};
    }
    .${scope}::before, .${scope}::after, .${scope} > span::before {
      content: "";
      pointer-events: none;
      position: absolute;
      inset-inline-start: 50%;
      inset-block-start: 50%;
      translate: -50% -50%;
      z-index: -1;
    }
    .${scope}:active { translate: 0 1px; }
    .${scope}::before {
      --size: calc(100% - var(--shadow-size) * 3);
      --position: 2px;
      --space: calc(var(--position) * 2);
      width: var(--size);
      height: var(--size);
      background: radial-gradient(circle at var(--position) var(--position), white calc(var(--position) / 4), transparent 0) padding-box;
      background-size: var(--space) var(--space);
      background-repeat: space;
      mask-image: conic-gradient(from calc(var(--gradient-angle-${id}) + 45deg), black, transparent 10% 90%, black);
      border-radius: inherit;
      opacity: ${showSpeckle ? speckleOpacity : 0};
      z-index: -1;
    }
    .${scope}::after {
      --animation: shimmer-${id} linear infinite;
      width: 100%;
      aspect-ratio: 1;
      background: linear-gradient(-50deg, transparent, var(--gleam-accent), transparent);
      mask-image: radial-gradient(circle at bottom, transparent 40%, black);
      opacity: ${showSheen ? 0.6 : 0};
    }
    .${scope} > span { z-index: 1; display: inline-flex; align-items: center; gap: 0.4em; }
    .${scope} > span::before {
      --size: calc(100% + 1rem);
      width: var(--size);
      height: var(--size);
      box-shadow: inset 0 -1ex 2rem 4px var(--gleam-accent);
      opacity: 0;
      transition: opacity var(--transition);
      animation: calc(var(--duration) * 1.5) breathe-${id} linear infinite;
    }
    .${scope}, .${scope}::before, .${scope}::after {
      animation: var(--animation) var(--duration), var(--animation) calc(var(--duration) / 0.4) reverse paused;
      animation-composition: add;
    }
    .${scope}:is(:hover, :focus-visible) {
      --gradient-percent-${id}: 20%;
      --gradient-angle-offset-${id}: 95deg;
      --gradient-shine-${id}: var(--gleam-accent-soft);
    }
    .${scope}:is(:hover, :focus-visible), .${scope}:is(:hover, :focus-visible)::before, .${scope}:is(:hover, :focus-visible)::after {
      animation-play-state: running;
    }
    .${scope}:is(:hover, :focus-visible) > span::before { opacity: 1; }
    .${scope} .gleam-badge {
      font-size: 0.7em;
      font-weight: 600;
      padding: 0.1em 0.55em;
      border-radius: 999px;
      background: ${badgeColor};
      color: ${badgeTextColor};
    }
    @keyframes gradient-angle-${id} { to { --gradient-angle-${id}: 360deg; } }
    @keyframes shimmer-${id} { to { rotate: 360deg; } }
    @keyframes breathe-${id} { from, to { scale: 1; } 50% { scale: 1.2; } }
    @media (prefers-reduced-motion: reduce) {
      .${scope}, .${scope}::before, .${scope}::after, .${scope} > span::before { animation: none !important; }
      .${scope}:is(:hover, :focus-visible) > span::before { opacity: 0; }
      .${scope} { transition: none; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <button
        type="button"
        className={`${scope} ${className}`}
        onClick={onClick}
        aria-label={badge ? `${label} (${badge})` : label}
        data-reduced-motion={reducedMotion ? "true" : undefined}
      >
        <span>
          {label}
          {badge && <span className="gleam-badge">{badge}</span>}
        </span>
      </button>
    </>
  );
}
