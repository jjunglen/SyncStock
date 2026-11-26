import { useEffect, useState } from "react";
import { LuArrowUp } from "react-icons/lu";

// A round "Back to top" button in the bottom-right corner, shown once the
// shopper has scrolled past about two screens (long lists that load more
// as they scroll). Smooth unless they've asked for reduced motion.
export default function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const check = () => setShown(window.scrollY > window.innerHeight * 2);
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  // From far down, jump to one screen from the top and glide only the
  // rest: a smooth scroll through a long list draws every card (and photo)
  // on the way, which ran iPhone Safari out of memory
  const toTop = () => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    if (window.scrollY > window.innerHeight * 1.5) window.scrollTo({ top: window.innerHeight, behavior: "auto" });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      className={`fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-text shadow-lg transition-all duration-200 hover:bg-surface-muted sm:right-6 sm:bottom-6 ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <LuArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
