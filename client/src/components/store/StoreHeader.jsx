import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../ui/Button.jsx";
import StoreBrandMark from "./StoreBrandMark.jsx";
import { useStoreInfo } from "../../lib/storeInfo.js";
import { useSignedIn } from "../../lib/useSignedIn.js";
import { useCart, checkoutPath } from "../../lib/cart.js";
import { storeHomePath, useStoreCategories, categoryPath } from "../../lib/storeLinks.js";
import { categoryLabel } from "../../lib/categories.js";
import Drawer, { DrawerSection, DrawerLink } from "../ui/Drawer.jsx";
import {
  LuShoppingBag,
  LuArrowLeft,
  LuMenu,
  LuHouse,
  LuSearch,
  LuTag,
  LuBell,
  LuPlus,
  LuUser,
  LuCircleHelp,
  LuStore,
} from "react-icons/lu";

const SITE = "https://www.syncstock.io";

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
  const categories = useStoreCategories();
  // Phones: the menu drawer (Browse, categories, the shopper's pages)
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const home = storeHomePath();

  // Log in / sign up already have Login and Sign up tabs, so the header
  // just offers a way back: the page they came from, or the store page
  // when they opened the form directly
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(storeHomePath());
  };

  return (
    <>
    <header className="fixed top-0 left-0 w-full z-40 bg-bg/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={storeHomePath()} className="flex min-w-0 items-center gap-2" aria-label={`${storeName} home`}>
          <StoreBrandMark name={storeName} logoUrl={store?.logo_url} subtitle="Powered by Syncstock" />
        </Link>
        {onAuthPage ? (
          <Button variant="ghost" size="sm" onClick={goBack}>
            <span className="flex items-center justify-center gap-2">
              <LuArrowLeft size={16} aria-hidden="true" /> Back
            </span>
          </Button>
        ) : (
          // Phones: the cart, the main button and the menu (Browse lives
          // there). Nothing account-related until we know whether they're
          // signed in, so the buttons don't swap after loading.
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {pathname !== "/browse" && (
              <Button to="/browse" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Browse
                </Button>
            )}
            {cartItems.length > 0 && signedIn !== null && (
              <Button
                to={checkoutPath(signedIn, { review: true })}
                aria-label={`Cart, ${cartItems.length} item${cartItems.length === 1 ? "" : "s"}`} variant="ghost" size="sm">
                  <span className="flex items-center justify-center gap-2">
                    <LuShoppingBag size={16} /> {cartItems.length}
                  </span>
                </Button>
            )}
            {signedIn === true && (
              <Button to="/store/dashboard" variant="primary" size="sm">
                  Your alerts
                </Button>
            )}
            {signedIn === false && (
              <>
                <Button to="/store/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                    Log in
                  </Button>
                {/* Phones have room for one button: it opens log in,
                    whose Sign up tab covers new shoppers */}
                <Button to="/store/login" variant="primary" size="sm" className="sm:hidden">
                    Sign up / Log in
                  </Button>
                <Button to="/store/signup" variant="primary" size="sm" className="hidden sm:inline-flex">
                    Sign up free
                  </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className="sm:hidden -mr-2 rounded-lg p-2.5 text-text transition-colors hover:bg-text/5"
            >
              <LuMenu size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>

    <Drawer
      open={menuOpen}
      onClose={closeMenu}
      title={storeName}
      footer={
        signedIn === false ? (
          <div className="flex flex-col gap-2">
            <Button to="/store/signup" variant="primary" fullWidth onClick={closeMenu}>
              Sign up free
            </Button>
            <Button to="/store/login" variant="secondary" fullWidth onClick={closeMenu}>
              Log in
            </Button>
          </div>
        ) : null
      }
    >
      <DrawerSection title="Shop">
        <DrawerLink to={home} icon={LuHouse} active={pathname === home} onClick={closeMenu}>
          Home
        </DrawerLink>
        <DrawerLink to="/browse" icon={LuSearch} active={pathname === "/browse"} onClick={closeMenu}>
          Everything in stock
        </DrawerLink>
        {(categories || []).length > 1 &&
          categories.map((c) => (
            <DrawerLink key={c.key} to={categoryPath(c.key, categories)} icon={LuTag} onClick={closeMenu}>
              {categoryLabel(c.key, c.name)}
            </DrawerLink>
          ))}
      </DrawerSection>
      {signedIn === true && (
        <DrawerSection title="Your alerts">
          <DrawerLink to="/store/dashboard" icon={LuBell} onClick={closeMenu}>
            Your dashboard
          </DrawerLink>
          <DrawerLink to="/store/track" icon={LuPlus} onClick={closeMenu}>
            Track an item
          </DrawerLink>
          <DrawerLink to="/store/profile" icon={LuUser} onClick={closeMenu}>
            Profile and sizes
          </DrawerLink>
        </DrawerSection>
      )}
      <DrawerSection title="More">
        <DrawerLink to={`${home}#how-it-works`} icon={LuCircleHelp} onClick={closeMenu}>
          How alerts work
        </DrawerLink>
        <DrawerLink href={`${SITE}/stores`} icon={LuStore} onClick={closeMenu}>
          More stores on Syncstock
        </DrawerLink>
      </DrawerSection>
    </Drawer>
    </>
  );
}
