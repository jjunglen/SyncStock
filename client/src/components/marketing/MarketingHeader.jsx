import { Link, useNavigate } from "react-router-dom";
import Button from "../ui/Button.jsx";
import { SyncStockLogo } from "../ui/SyncStockMark.jsx";
import FloatingMenu from "../ui/FloatingMenu.jsx";

const NAV_ITEMS = [
  { title: "How it works", href: "/#features" },
  { title: "Pricing", href: "/pricing" },
];

export default function MarketingHeader() {
  const navigate = useNavigate();

  const mobileMenuItems = [
    ...NAV_ITEMS.map((item) => ({
      label: item.title,
      onClick: () => {
        window.location.href = item.href;
      },
    })),
    { label: "Log in", onClick: () => navigate("/login") },
    { label: "Link POS", onClick: () => navigate("/onboarding") },
  ];

  return (
    <>
      <header className="w-full z-40 fixed top-0 left-0 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" aria-label="Syncstock home">
            <SyncStockLogo size={26} />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-white/5 transition-colors"
              >
                {item.title}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to="/onboarding">
              <Button variant="primary" size="sm">
                Link POS
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="lg:hidden">
        <FloatingMenu items={mobileMenuItems} position="top-right" />
      </div>
    </>
  );
}
