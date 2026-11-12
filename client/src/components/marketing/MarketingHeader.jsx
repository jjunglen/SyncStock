import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LuMenu, LuSparkles, LuTag, LuStore, LuFootprints, LuShirt, LuLayers } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import { SyncStockLogo } from "../ui/SyncStockMark.jsx";
import Drawer, { DrawerSection, DrawerLink } from "../ui/Drawer.jsx";
import { USE_CASES } from "../../lib/useCases.js";

const NAV_ITEMS = [
  { title: "How it works", href: "/#features", icon: LuSparkles },
  { title: "Pricing", href: "/pricing", icon: LuTag },
  { title: "Joined stores", href: "/stores", icon: LuStore },
];

// An icon for each "Built for" page (lib/useCases.js)
const USE_CASE_ICONS = {
  "/for/sneaker-stores": LuFootprints,
  "/for/streetwear-stores": LuShirt,
  "/for/trading-card-shops": LuLayers,
};

export default function MarketingHeader() {
  const { pathname } = useLocation();
  // Phones and tablets: the menu drawer (components/ui/Drawer.jsx)
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="w-full z-40 fixed top-0 left-0 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" aria-label="Syncstock home">
            <SyncStockLogo size={26} />
          </Link>

          <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-white/5 transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Button to="/login" variant="ghost" size="sm">
              Log in
            </Button>
            <Button to="/onboarding" variant="primary" size="sm">
              Install on Shopify
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="lg:hidden -mr-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-text/5"
          >
            <LuMenu size={18} aria-hidden="true" />
            Menu
          </button>
        </div>
      </header>

      <Drawer
        open={menuOpen}
        onClose={closeMenu}
        title="Syncstock"
        footer={
          <div className="flex flex-col gap-2">
            <Button to="/onboarding" variant="primary" fullWidth onClick={closeMenu}>
              Install on Shopify
            </Button>
            <Button to="/login" variant="secondary" fullWidth onClick={closeMenu}>
              Log in
            </Button>
          </div>
        }
      >
        <DrawerSection>
          {NAV_ITEMS.map((item) => (
            <DrawerLink key={item.href} to={item.href} icon={item.icon} active={pathname === item.href} onClick={closeMenu}>
              {item.title}
            </DrawerLink>
          ))}
        </DrawerSection>
        <DrawerSection title="Built for">
          {USE_CASES.map((page) => (
            <DrawerLink
              key={page.path}
              to={page.path}
              icon={USE_CASE_ICONS[page.path]}
              active={pathname === page.path}
              onClick={closeMenu}
            >
              {page.navLabel}
            </DrawerLink>
          ))}
        </DrawerSection>
      </Drawer>
    </>
  );
}
