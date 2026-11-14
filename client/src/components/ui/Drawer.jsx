import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router-dom";
import { LuX } from "react-icons/lu";

// A panel that slides in from the side over a dimmed page — the phone
// menu. Escape, the close button or a tap outside closes it; the page
// behind doesn't scroll, and Tab stays inside while it's open. Focus goes
// back to the button that opened it.
//   side: "right" (next to the header's menu button) or "left"
//   wide: a roomier panel (an item's details rather than a menu)
const ease = [0.22, 1, 0.36, 1];
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Drawer({ open, onClose, title, side = "right", wide = false, children, footer }) {
  const panelRef = useRef(null);
  const titleId = useId();
  // The latest onClose, without restarting the effect when it changes
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    // The close button first, so a screen reader starts at the top
    // (no focus ring for a tap; keyboard users still get theirs)
    panelRef.current?.querySelector(FOCUSABLE)?.focus({ focusVisible: false });

    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open]);

  const offscreen = side === "left" ? "-100%" : "100%";
  // Pages built ahead of time (scripts/prerender.mjs) have no document
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200]">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`absolute top-0 bottom-0 ${side === "left" ? "left-0 border-r" : "right-0 border-l"} flex ${wide ? "w-[min(28rem,92vw)]" : "w-[min(20rem,85vw)]"} flex-col border-border bg-surface text-text shadow-2xl`}
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
              <p id={titleId} className="min-w-0 truncate font-display font-semibold">
                {title}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="-mr-2 shrink-0 rounded-lg p-2.5 text-text-muted transition-colors hover:bg-text/5 hover:text-text"
              >
                <LuX size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">{children}</div>
            {footer && <div className="shrink-0 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// A group of links in the drawer, with an optional small heading
export function DrawerSection({ title, children }) {
  return (
    <div className="mb-4 last:mb-0">
      {title && <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-text-muted">{title}</p>}
      <nav aria-label={title} className="flex flex-col">
        {children}
      </nav>
    </div>
  );
}

// One menu row: icon and label, a real link (crawlable, opens in a new
// tab on long-press). `href` for other sites, `to` for pages here;
// newTab opens an `href` in a new tab.
export function DrawerLink({ to, href, icon: Icon, active = false, newTab = false, onClick, children }) {
  const className = `flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition-colors hover:bg-text/5 ${
    active ? "bg-text/5 font-medium text-text" : "text-text"
  }`;
  const content = (
    <>
      {Icon && <Icon size={18} className="shrink-0 text-text-muted" aria-hidden="true" />}
      <span className="min-w-0 truncate">{children}</span>
    </>
  );
  return href ? (
    <a href={href} className={className} onClick={onClick} {...(newTab && { target: "_blank", rel: "noopener noreferrer" })}>
      {content}
    </a>
  ) : (
    <Link to={to} className={className} onClick={onClick} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}

// A menu row that does something here rather than going somewhere
// (light/dark mode, sign out)
export function DrawerButton({ icon: Icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] text-text transition-colors hover:bg-text/5"
    >
      {Icon && <Icon size={18} className="shrink-0 text-text-muted" aria-hidden="true" />}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
