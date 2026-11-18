import { useState } from "react";
import { LuLayoutTemplate, LuExternalLink, LuX } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import { useThemeSetup, allowThemeAccess, openThemeEditor } from "../../lib/themeSetup.js";

// Dashboard notice when SyncStock's floating "Restock alerts" button isn't
// on the store's live Shopify theme — most often after switching themes,
// which leaves app settings behind. Shopify only lets the merchant switch
// it on, so this is the one click (then Save in Shopify). Stores that
// haven't granted read-only theme access yet are asked once.
// "Not now" hides it on this device until the theme changes.
const DISMISS_KEY = "syncstock_theme_notice_dismissed";

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

export default function ThemeSetupBanner() {
  const data = useThemeSetup();
  const [dismissed, setDismissed] = useState(readDismissed);
  const status = data?.status;
  if (!status) return null;

  const missing = status.access && status.theme_id && !status.button_on;
  const needsAccess = !status.access;
  if (!missing && !needsAccess) return null;

  // Hidden per theme (or until access is granted)
  const key = needsAccess ? "access" : status.theme_id;
  if (dismissed === key) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, key);
    } catch {
      // Storage blocked: hidden until the page reloads
    }
    setDismissed(key);
  };

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="shrink-0 rounded-lg bg-primary/10 p-2">
          <LuLayoutTemplate size={18} className="text-text" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {needsAccess
              ? "Keep your Restock alerts button on your store"
              : `Your theme${status.theme_name ? `, ${status.theme_name},` : ""} doesn't have the Restock alerts button`}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {needsAccess
              ? "Let SyncStock read your theme (read-only) and we'll tell you if the button goes missing, like after you switch themes."
              : "Switching themes leaves app settings behind. One click turns it back on. Then click Save in Shopify."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {needsAccess ? (
          <Button variant="primary" size="sm" onClick={allowThemeAccess}>
            Allow in Shopify
          </Button>
        ) : (
          data.links?.button && (
            <Button variant="primary" size="sm" onClick={() => openThemeEditor(data.links.button)}>
              <span className="flex items-center gap-1.5">
                Turn on button <LuExternalLink size={13} aria-hidden="true" />
              </span>
            </Button>
          )
        )}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-2 text-text-muted hover:bg-text/5 hover:text-text"
          aria-label="Not now"
          title="Not now"
        >
          <LuX size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
