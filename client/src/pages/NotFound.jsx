import { Link } from "react-router-dom";
import MarketingHeader from "../components/marketing/MarketingHeader.jsx";
import { getSubdomain } from "../lib/getSubdomain.js";

// Any address the site doesn't have. Not indexed (components/Seo.jsx).
export default function NotFound() {
  const store = !!getSubdomain();
  return (
    <div className="min-h-screen bg-bg text-text">
      {!store && <MarketingHeader />}
      <main className="mx-auto flex max-w-md flex-col items-center px-6 pt-40 text-center">
        <p className="text-sm text-text-muted">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-text-muted">That page doesn't exist or has moved.</p>
        <Link
          to={store ? "/store/dashboard" : "/"}
          className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-text"
        >
          {store ? "Go to the store" : "Go to the home page"}
        </Link>
      </main>
    </div>
  );
}
