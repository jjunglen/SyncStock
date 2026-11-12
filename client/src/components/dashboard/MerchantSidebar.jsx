import { useState, useSyncExternalStore } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuTrendingUp,
  LuScale,
  LuStore,
  LuShoppingBag,
  LuUser,
  LuUsers,
  LuSettings,
  LuLogOut,
  LuRuler,
  LuChevronDown,
  LuChevronsRight,
  LuHandCoins,
  LuMenu,
} from "react-icons/lu";
import SyncStockMark from "../ui/SyncStockMark.jsx";
import BetaBadge from "../ui/BetaBadge.jsx";
import Drawer, { DrawerSection, DrawerLink, DrawerButton } from "../ui/Drawer.jsx";
import { useMyStore, storefrontUrl } from "../../lib/myStore.js";
import { IN_SHOPIFY_ADMIN } from "../../lib/shopifyAdmin.js";
import api from "../../lib/api.js";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    to: "/dashboard",
  },
  { key: "sourcing", label: "Sourcing", icon: LuTrendingUp, to: "/sourcing" },
  // Pricing (beta): listings against the store's own sales, plus the
  // StockX comparison tab for stores that have it (StorePricingPage.jsx)
  { key: "pricing", label: "Pricing", icon: LuScale, to: "/prices", beta: true },
  // "Sell your items" (beta): what shoppers sent, and the price guide
  { key: "buy-requests", label: "Buy requests", icon: LuHandCoins, to: "/buy-requests", beta: true },
  {
    key: "purchases",
    label: "Purchases",
    icon: LuShoppingBag,
    to: "/purchases",
  },
  {
    key: "storefront",
    label: "View storefront",
    icon: LuStore,
    external: true,
  },
  {
    key: "account", 
    label: "Account",
    icon: LuUser,
    to: "/account",

  },
  { 
    key: "customers",
    label: "Customers", 
    icon: LuUsers, 
    to: "/customers"
  },
  {
    key: "settings",
    label: "Store settings",
    icon: LuSettings,
    to: "/settings",
  },
  // The "other" category's name and size chart (SizeSettings.jsx)
  { key: "size-settings", label: "Size settings", icon: LuRuler, to: "/size-settings" },
];

// Under the store name: the store's real plan and billing state
// (Store.plan / billing_status), not a fixed "Pro plan"
const planLabel = (store) => {
  if (!store) return "";
  if (store.plan === "internal") return "Flagship store";
  if (!store.plan) return "No plan yet";
  switch (store.billing_status) {
    case "pending":
      return "Pro plan · awaiting approval";
    case "frozen":
      return "Pro plan · billing paused";
    case "cancelled":
    case "declined":
    case "expired":
      return "Plan inactive";
    default:
      return "Pro plan";
  }
};

// Expanded/collapsed is remembered per browser, so it stays the same
// across pages (each page renders its own sidebar) until toggled again
const SIDEBAR_KEY = "syncstock_sidebar_open";

const readSavedOpen = () => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== "false";
  } catch {
    return true;
  }
};

const saveOpen = (open) => {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(open));
  } catch {
    // Storage blocked — the choice just won't carry over to the next page
  }
};

// Phones get a top bar with a menu instead of the sidebar (an icon-only
// rail had no labels, and hover tooltips don't exist on touch screens)
const MOBILE_QUERY = "(max-width: 767px)";
const subscribeToMobile = (onChange) => {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useIsMobile = () =>
  // (desktop when pages are built ahead of time, scripts/prerender.mjs)
  useSyncExternalStore(subscribeToMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);

function NavOption({ item, isSelected, onClick, open }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      disabled={item.disabled}
      className={`relative flex h-11 w-full items-center rounded-md transition-colors ${
        item.disabled
          ? "text-text-muted/50 cursor-not-allowed"
          : isSelected
            ? "bg-white/5 text-text border-l-2 border-primary"
            : "text-text-muted hover:bg-white/5 hover:text-text"
      }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon size={16} />
      </div>
      {open && (
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {item.label}
          {item.beta && <BetaBadge size="xs" />}
        </span>
      )}
    </button>
  );
}

// preview: a sample store for the landing page's dashboard preview —
// nothing is fetched, and the sidebar sizes to its content
export default function MerchantSidebar({ preview = null }) {
  const myStore = useMyStore(!preview);
  const store = preview || myStore;
  const storeName = store?.name;
  const [savedOpen, setSavedOpen] = useState(readSavedOpen);
  const isMobile = useIsMobile();
  // The preview is always shown expanded (except on phones)
  const open = (preview || savedOpen) && !isMobile;
  const navigate = useNavigate();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Phones: the menu drawer (components/ui/Drawer.jsx)
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Sign out of the merchant dashboard (syncstock.io). Not shown inside the
  // Shopify admin, where Shopify signs merchants in and out. A full page
  // load afterwards, so nothing from this session stays in memory.
  const signOut = async () => {
    setSigningOut(true);
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      window.location.assign("/login");
    }
  };
  const canSignOut = !preview && !IN_SHOPIFY_ADMIN;

  const toggleOpen = () => {
    const next = !savedOpen;
    setSavedOpen(next);
    saveOpen(next);
  };
  const location = useLocation();

  const handleClick = (item) => {
    if (item.disabled) return;
    if (item.external) {
      // Still loading the store — nothing to open yet
      if (store?.subdomain) window.open(storefrontUrl(store.subdomain), "_blank");
      return;
    }
    navigate(item.to);
  };

  const signOutDialog = (
    <>
        {confirmSignOut && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmSignOut(false)} aria-hidden="true" />
            <div role="dialog" aria-modal="true" aria-labelledby="sign-out-title" className="relative w-full max-w-sm rounded-xl border border-border bg-surface p-6">
              <h3 id="sign-out-title" className="text-base font-semibold mb-2">Sign out?</h3>
              <p className="text-sm text-text-muted mb-6">You'll need your email and password to get back into your dashboard.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-text/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        )}
  
    </>
  );

  if (isMobile && !preview) {
    return (
      <>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <SyncStockMark size={24} className="shrink-0 text-text" />
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text">{storeName || "Your store"}</span>
              <span className="block truncate text-xs text-text-muted">{planLabel(store)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="-mr-1 flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-text/5"
          >
            <LuMenu size={18} aria-hidden="true" />
            Menu
          </button>
        </header>

        <Drawer open={menuOpen} onClose={closeMenu} title={storeName || "Your store"}>
          <DrawerSection>
            {NAV_ITEMS.filter((item) => !item.flagshipOnly || store?.plan === "internal").map((item) =>
              item.external ? (
                <DrawerLink
                  key={item.key}
                  href={store?.subdomain ? storefrontUrl(store.subdomain) : undefined}
                  icon={item.icon}
                  newTab
                  onClick={closeMenu}
                >
                  {item.label}
                </DrawerLink>
              ) : (
                <DrawerLink key={item.key} to={item.to} icon={item.icon} active={location.pathname === item.to} onClick={closeMenu}>
                  {item.label}
                  {item.beta && <BetaBadge size="xs" className="ml-2 align-middle" />}
                </DrawerLink>
              ),
            )}
          </DrawerSection>
          {canSignOut && (
            <DrawerSection title="Account">
              <DrawerButton
                icon={LuLogOut}
                onClick={() => {
                  closeMenu();
                  setConfirmSignOut(true);
                }}
              >
                Sign out
              </DrawerButton>
            </DrawerSection>
          )}
        </Drawer>

        {signOutDialog}
      </>
    );
  }

  return (
    <nav
      className={`${preview ? "relative" : "sticky top-0 h-screen"} shrink-0 border-r border-border bg-surface p-2 transition-all duration-300 ${open ? "w-64" : "w-16"}`}
    >
      <div className="mb-6 border-b border-border pb-4">
        <div className="flex items-center justify-between rounded-md p-2">
          <div className="flex items-center gap-2">
            <SyncStockMark size={open ? 26 : 28} className="text-text" />
            {open && (
              <div>
                <span className="block text-sm font-semibold text-text">
                  {storeName || "Your store"}
                </span>
                <span className="block text-xs text-text-muted">{planLabel(store)}</span>
              </div>
            )}
          </div>
          {open && <LuChevronDown size={14} className="text-text-muted" />}
        </div>
      </div>

      <div className="space-y-1">
        {NAV_ITEMS.filter((item) => !item.flagshipOnly || store?.plan === "internal").map((item) => (
          <NavOption
            key={item.key}
            item={item}
            isSelected={preview ? item.key === "dashboard" : location.pathname === item.to}
            onClick={() => handleClick(item)}
            open={open}
          />
        ))}
        {canSignOut && (
          <NavOption
            item={{ key: "sign-out", label: "Sign out", icon: LuLogOut }}
            isSelected={false}
            onClick={() => setConfirmSignOut(true)}
            open={open}
          />
        )}
      </div>

      {signOutDialog}

      {!isMobile && !preview && (
      <button
        onClick={toggleOpen}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        className="absolute bottom-0 left-0 right-0 border-t border-border hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center p-3">
          <div className="grid size-10 place-content-center">
            <LuChevronsRight
              size={16}
              className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
          {open && (
            <span className="text-sm font-medium text-text-muted">Hide</span>
          )}
        </div>
      </button>
      )}
    </nav>
  );
}
