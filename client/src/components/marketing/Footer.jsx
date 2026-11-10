import { Link } from "react-router-dom";
import { LEGAL } from "../../lib/legal.js";
import { SyncStockLogo } from "../ui/SyncStockMark.jsx";
import { USE_CASES } from "../../lib/useCases.js";

// Every marketing page is one click from here (crawl depth)
const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Joined stores", href: "/stores" },
  { label: "Sign in", href: "/login" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <SyncStockLogo size={24} className="mb-3" />
            <p className="text-sm text-text-muted">Get more out of every restock.</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Quick links</h3>
            <nav className="flex flex-col gap-2 text-sm">
              {QUICK_LINKS.map((link) => (
                <Link key={link.label} to={link.href} className="text-text-muted hover:text-text transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Built for</h3>
            <nav className="flex flex-col gap-2 text-sm">
              {USE_CASES.map((page) => (
                <Link key={page.path} to={page.path} className="text-text-muted hover:text-text transition-colors">
                  {page.navLabel}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Contact</h3>
            <a href={`mailto:${LEGAL.contactEmail}`} className="text-sm text-text-muted hover:text-text transition-colors">
              {LEGAL.contactEmail}
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">© {new Date().getFullYear()} Syncstock. All rights reserved.</p>
          <nav className="flex gap-4 text-xs text-text-muted">
            <Link to="/privacy" className="hover:text-text transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-text transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-text transition-colors">Cookies</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
