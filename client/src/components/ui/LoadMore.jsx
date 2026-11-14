import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Spinner from "./Spinner.jsx";

// Sits under a list: when it scrolls near the screen, the next batch
// loads (onMore). The "Load more" button stays as a fallback for keyboards
// and screen readers; with `to` it's a real link to the next page, so
// search engines can still reach every product.
export default function LoadMore({ onMore, loading, to, label = "Load more" }) {
  const spot = useRef(null);
  const latest = useRef(onMore);
  useEffect(() => {
    latest.current = onMore;
  });

  useEffect(() => {
    const el = spot.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && latest.current(),
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // Watched again after each batch, so a short batch that leaves this
    // spot on screen still loads the next one
  }, [loading]);

  const className = "text-sm text-text-muted hover:text-text underline";
  const more = (e) => {
    e?.preventDefault();
    onMore();
  };

  return (
    <div ref={spot} className="flex justify-center py-8" aria-live="polite">
      {loading ? (
        <Spinner size={20} />
      ) : to ? (
        <Link to={to} rel="next" onClick={more} className={className}>
          {label}
        </Link>
      ) : (
        <button type="button" onClick={more} className={className}>
          {label}
        </button>
      )}
    </div>
  );
}
