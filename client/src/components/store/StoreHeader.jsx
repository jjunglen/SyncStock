import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../ui/Button.jsx";
import StoreBrandMark from "./StoreBrandMark.jsx";
import { useStoreInfo } from "../../lib/storeInfo.js";
import { useSignedIn } from "../../lib/useSignedIn.js";
import { useCart, checkoutPath } from "../../lib/cart.js";
import { LuShoppingBag, LuArrowLeft } from "react-icons/lu";

// Top bar for a store's public pages (landing, Browse, products, log in,
// sign up). The store name always links back to the store page, so
// shoppers are never stuck on a form. Pass storeName if the page already
// loaded the store.
export default function StoreHeader({ storeName: nameFromPage }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const store = useStoreInfo();
  const storeName = nameFromPage || store?.name || "Store";
  const signedIn = useSignedIn();
  const onAuthPage = pathname === "/store/login" || pathname === "/store/signup";
  const cartItems = useCart();

  // Log in / sign up already have Login and Sign up tabs, so the header
  // just offers a way back: the page they came from, or the store page
  // when they opened the form directly
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate("/store");
  };

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-bg/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/store" className="flex min-w-0 items-center gap-2" aria-label={`${storeName} home`}>
          <StoreBrandMark name={storeName} logoUrl={store?.logo_url} subtitle="Powered by Syncstock" />
        </Link>
        {onAuthPage ? (
          <Button variant="ghost" size="sm" onClick={goBack}>
            <span className="flex items-center justify-center gap-2">
              <LuArrowLeft size={16} aria-hidden="true" /> Back
            </span>
          </Button>
        ) : (
          // Phones: just the cart and the main button (Browse is on the
          // page itself). Nothing account-related until we know whether
          // they're signed in, so the buttons don't swap after loading.
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {pathname !== "/browse" && (
              <Link to="/browse" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Browse
                </Button>
              </Link>
            )}
            {cartItems.length > 0 && signedIn !== null && (
              <Link
                to={checkoutPath(signedIn, { review: true })}
                aria-label={`Cart, ${cartItems.length} item${cartItems.length === 1 ? "" : "s"}`}
              >
                <Button variant="ghost" size="sm">
                  <span className="flex items-center justify-center gap-2">
                    <LuShoppingBag size={16} /> {cartItems.length}
                  </span>
                </Button>
              </Link>
            )}
            {signedIn === true && (
              <Link to="/store/dashboard">
                <Button variant="primary" size="sm">
                  Your alerts
                </Button>
              </Link>
            )}
            {signedIn === false && (
              <>
                <Link to="/store/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                {/* Phones have room for one button: it opens log in,
                    whose Sign up tab covers new shoppers */}
                <Link to="/store/login" className="sm:hidden">
                  <Button variant="primary" size="sm">
                    Sign up / Log in
                  </Button>
                </Link>
                <Link to="/store/signup" className="hidden sm:block">
                  <Button variant="primary" size="sm">
                    Sign up free
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
