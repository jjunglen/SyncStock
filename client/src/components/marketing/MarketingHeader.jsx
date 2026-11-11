import { Link, useNavigate } from "react-router-dom";
import Button from "../ui/Button.jsx";
import { SyncStockLogo } from "../ui/SyncStockMark.jsx";
import FloatingMenu from "../ui/FloatingMenu.jsx";

const NAV_ITEMS = [
  { title: "How it works", href: "/#features" },
  { title: "Pricing", href: "/pricing" },
  { title: "Joined stores", href: "/stores" },
];

export default function MarketingHeader() {
  const navigate = useNavigate();

  // Real links (href) so crawlers on phones see them too
  const mobileMenuItems = [
    ...NAV_ITEMS.map((item) => ({
      label: item.title,
      href: item.href,
      onClick: () => navigate(item.href),
    })),
    { label: "Log in", href: "/login", onClick: () => navigate("/login") },
    { label: "Install on Shopify", href: "/onboarding", onClick: () => navigate("/onboarding") },
  ];

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
        </div>
      </header>

      <div className="lg:hidden">
        <FloatingMenu items={mobileMenuItems} position="top-right" />
      </div>
    </>
  );
}
