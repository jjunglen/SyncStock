import { Link, useLocation } from "react-router-dom";
import Button from "../ui/Button.jsx";
import StoreBrandMark from "./StoreBrandMark.jsx";
import { useStoreInfo } from "../../lib/storeInfo.js";

// Top bar for a store's public pages (landing, log in, sign up). The
// store name always links back to the store page, so shoppers are never
// stuck on a form. Pass storeName if the page already loaded the store.
export default function StoreHeader({ storeName: nameFromPage }) {
  const { pathname } = useLocation();
  const store = useStoreInfo();
  const storeName = nameFromPage || store?.name || "Store";

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-bg/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/store" className="flex items-center gap-2" aria-label={`${storeName} home`}>
          <StoreBrandMark name={storeName} logoUrl={store?.logo_url} subtitle="Powered by Syncstock" />
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
