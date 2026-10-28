import { useEffect, useState } from "react";
import { LuX, LuShare, LuSmartphone } from "react-icons/lu";
import Button from "../ui/Button.jsx";

// A small banner on the shopper's dashboard, on phones only, offering to
// put the store on their Home Screen so it opens like an app (and on
// iPhone, so browser notifications can be turned on — public/manifest).
//   Android (Chrome, Edge, Samsung): an "Add" button opens the browser's
//     own install prompt
//   iPhone: Safari has no prompt, so it says where to tap
// Hidden once added (opened from the Home Screen) and for 30 days after
// "Not now".

const DISMISS_KEY = "syncstock_home_screen_dismissed";
const DISMISS_DAYS = 30;

// Chrome fires this once, early — often before the dashboard is shown —
// so it's caught as soon as the app loads
let installEvent = null;
const listeners = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // our banner instead of Chrome's own bar
    installEvent = e;
    listeners.forEach((fn) => fn(e));
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    listeners.forEach((fn) => fn(null));
  });
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isPhone = () => window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 768;
const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const wasDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

export default function AddToHomeScreen() {
  const [prompt, setPrompt] = useState(installEvent);
  const [hidden, setHidden] = useState(() => !isPhone() || isInstalled() || wasDismissed());

  useEffect(() => {
    listeners.add(setPrompt);
    return () => listeners.delete(setPrompt);
  }, []);

  if (hidden || (!prompt && !isIOS())) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // private browsing: hide for this visit only
    }
    setHidden(true);
  };

  const install = async () => {
    prompt.prompt();
    const { outcome } = await prompt.userChoice.catch(() => ({ outcome: "dismissed" }));
    installEvent = null;
    setPrompt(null);
    if (outcome === "accepted") setHidden(true);
    else dismiss();
  };

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
        <LuSmartphone size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Add to your Home Screen</p>
        {prompt ? (
          <p className="text-xs text-text-muted mt-0.5">Open the store like an app, one tap away.</p>
        ) : (
          <p className="text-xs text-text-muted mt-0.5">
            In Safari, tap <span className="text-text">•••</span> then{" "}
            <span className="text-text">
              Share <LuShare size={12} className="inline -mt-0.5" aria-hidden="true" />
            </span>{" "}
            (or tap Share directly), then <span className="text-text">Add to Home Screen</span>. It
            opens like an app and can send you alerts.
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          {prompt && (
            <Button variant="primary" size="sm" onClick={install}>
              Add
            </Button>
          )}
          <button type="button" onClick={dismiss} className="text-xs text-text-muted hover:text-text px-2 py-1">
            Not now
          </button>
        </div>
      </div>
      <button type="button" onClick={dismiss} aria-label="Close" className="text-text-muted hover:text-text">
        <LuX size={16} />
      </button>
    </div>
  );
}
