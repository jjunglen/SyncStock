import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../ui/Button.jsx";
import SignalDot from "../ui/SignalDot.jsx";
import api from "../../lib/api.js";

// Top bar for a store's public pages (landing, log in, sign up). The
// store name always links back to the store page, so shoppers are never
// stuck on a form. Pass storeName if the page already loaded the store.
export default function StoreHeader({ storeName: nameFromPage }) {
  const { pathname } = useLocation();
  const [fetchedName, setFetchedName] = useState("");

  useEffect(() => {
    if (nameFromPage) return;
    api
      .get("/store")
      .then((res) => setFetchedName(res.data.data?.name || ""))
      .catch(() => {});
  }, [nameFromPage]);

  const storeName = nameFromPage || fetchedName || "Store";

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-bg/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/store" className="flex items-center gap-2" aria-label={`${storeName} home`}>
          <SignalDot tone="live" size="md" />
          <div>
            <span className="font-display font-semibold text-sm">{storeName}</span>
            <span className="block text-[10px] text-text-muted -mt-0.5">
              Powered by Syncstock
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {pathname !== "/store/login" && (
            <Link to="/store/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
          )}
          {pathname !== "/store/signup" && (
            <Link to="/store/signup">
              <Button variant="primary" size="sm">
                Sign up free
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
