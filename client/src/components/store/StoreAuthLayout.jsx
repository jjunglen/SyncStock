import { Link } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";
import StoreHeader from "./StoreHeader.jsx";

// Wraps the store's log in / sign up forms with the store header and a
// way back to the store page
export default function StoreAuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <StoreHeader />
      <main className="pt-20 pb-16">
        <div className="max-w-sm mx-auto px-6">
          <Link
            to="/store"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors"
          >
            <LuArrowLeft size={14} aria-hidden="true" /> Back to store
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
