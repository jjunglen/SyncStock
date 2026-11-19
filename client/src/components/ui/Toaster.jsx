import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuCheck, LuCircleAlert, LuX } from "react-icons/lu";

import { setToastListener } from "../../lib/toast.js";

// Shows the messages from showToast (lib/toast.js); mounted once in App.jsx

const SHOW_MS = 4500;

export default function Toaster() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setToastListener(setToast);
    return () => setToastListener(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      {toast && (
        <div
          key={toast.id}
          className="animate-appear pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text shadow-lg"
        >
          {toast.tone === "error" ? (
            <LuCircleAlert size={18} className="shrink-0 text-warn" aria-hidden="true" />
          ) : (
            <LuCheck size={18} className="shrink-0 text-live" aria-hidden="true" />
          )}
          <span className="min-w-0">{toast.message}</span>
          {toast.link && (
            <Link to={toast.link.to} onClick={() => setToast(null)} className="shrink-0 font-medium underline">
              {toast.link.label}
            </Link>
          )}
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="-mr-1 shrink-0 p-1 text-text-muted hover:text-text">
            <LuX size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
