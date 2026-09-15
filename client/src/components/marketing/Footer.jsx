import { Link } from "react-router-dom";
import { FaFacebook, FaXTwitter, FaInstagram, FaLinkedin } from "react-icons/fa6";

const QUICK_LINKS = [
{ label: "Home", href: "/" },
{ label: "How it works", href: "/#how-it-works" },
{ label: "Pricing", href: "/pricing" },
{ label: "Sign in", href: "/login" },
];

const SOCIAL_LINKS = [
{ label: "Facebook", icon: FaFacebook, href: "#" },
{ label: "Twitter", icon: FaXTwitter, href: "#" },
{ label: "Instagram", icon: FaInstagram, href: "#" },
{ label: "LinkedIn", icon: FaLinkedin, href: "#" },
];

export default function Footer() {
return (
    <footer className="border-t border-border bg-bg">
    <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid gap-10 md:grid-cols-3">
        <div>
            <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-live" />
            <span className="font-display font-semibold text-sm">Syncstock</span>
            </div>
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
            <h3 className="text-sm font-semibold mb-3">Follow us</h3>
            <div className="flex gap-2 mb-4">
            {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    title={social.label}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-white/20 transition-colors"
                >
                    <Icon size={14} />
                </a>
                );
            })}
            </div>
            <p className="text-sm text-text-muted">hello@syncstock.io</p>
        </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Syncstock. All rights reserved.
        </p>
        <nav className="flex gap-4 text-xs text-text-muted">
            <a href="#" className="hover:text-text transition-colors">Privacy</a>
            <a href="#" className="hover:text-text transition-colors">Terms</a>
            <a href="#" className="hover:text-text transition-colors">Cookies</a>
        </nav>
        </div>
    </div>
    </footer>
);
}