import { Link } from "react-router-dom";
import { useStoreInfo } from "../../lib/storeInfo.js";
import { useSignedIn } from "../../lib/useSignedIn.js";
import { categoryLabel } from "../../lib/categories.js";
import { storeHomePath, useStoreCategories, categoryPath } from "../../lib/storeLinks.js";

// Bottom of a store's public pages (home, Browse, products, not found):
// every category, the shopper's account, the legal pages, and the way to
// other stores on Syncstock. Legal pages and other stores are on
// www.syncstock.io (their one address). Real links, so shoppers and search engines
// can reach every part of the site from any page.
const SITE = "https://www.syncstock.io";

export default function StoreFooter({ storeName: nameFromPage }) {
  const store = useStoreInfo();
  const storeName = nameFromPage || store?.name || "This store";
  const signedIn = useSignedIn();
  const categories = useStoreCategories();

  // Taller than the text, so links are easy to tap on phones
  const linkClass = "inline-block py-1.5 text-text-muted hover:text-text transition-colors";

  return (
    <footer className="border-t border-border bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 grid-cols-2 md:grid-cols-4 text-sm">
        <div className="col-span-2 md:col-span-1">
          <Link to={storeHomePath()} className="font-display font-semibold text-text hover:underline">
            {storeName}
          </Link>
          <p className="mt-2 text-text-muted">
            Restock alerts for {storeName}: save your sizes and hear the moment what you want is in stock.
          </p>
        </div>

        <nav aria-label="Shop">
          <h2 className="font-semibold mb-3">Shop</h2>
          <ul className="flex flex-col">
            <li>
              <Link to="/browse" className={linkClass}>
                Everything in stock
              </Link>
            </li>
            {(categories || []).map((c) => (
              <li key={c.key}>
                <Link to={categoryPath(c.key, categories)} className={linkClass}>
                  {categoryLabel(c.key, c.name)}
                </Link>
              </li>
            ))}
            {store?.coming_soon && (
              <li>
                <Link to="/coming-soon" className={linkClass}>
                  Coming soon
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <nav aria-label="Your account">
          <h2 className="font-semibold mb-3">Your alerts</h2>
          <ul className="flex flex-col">
            {signedIn ? (
              <>
                <li>
                  <Link to="/store/dashboard" className={linkClass}>Your dashboard</Link>
                </li>
                <li>
                  <Link to="/store/track" className={linkClass}>Track an item</Link>
                </li>
                <li>
                  <Link to="/store/profile" className={linkClass}>Profile and sizes</Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/store/signup" className={linkClass}>Sign up for alerts</Link>
                </li>
                <li>
                  <Link to="/store/login" className={linkClass}>Log in</Link>
                </li>
              </>
            )}
            <li>
              <Link to={`${storeHomePath()}#how-it-works`} className={linkClass}>How alerts work</Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="About">
          <h2 className="font-semibold mb-3">About</h2>
          <ul className="flex flex-col">
            <li>
              <a href={`${SITE}/stores`} className={linkClass}>More stores on Syncstock</a>
            </li>
            <li>
              <a href={`${SITE}/privacy`} className={linkClass}>Privacy Policy</a>
            </li>
            <li>
              <a href={`${SITE}/terms`} className={linkClass}>Terms of Service</a>
            </li>
            <li>
              <a href={`${SITE}/cookies`} className={linkClass}>Cookie Policy</a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="max-w-6xl mx-auto px-4 py-4 text-xs text-text-muted">
          Restock alerts powered by{" "}
          <a href={SITE} className="hover:text-text underline-offset-2 hover:underline">
            Syncstock
          </a>
        </p>
      </div>
    </footer>
  );
}
