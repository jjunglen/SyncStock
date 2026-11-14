import { Link, useSearchParams } from "react-router-dom";
import StoreHeader from "../../components/store/StoreHeader.jsx";
import StoreFooter from "../../components/store/StoreFooter.jsx";
import ComingSoonGrid from "../../components/store/ComingSoonGrid.jsx";
import NotFound from "../NotFound.jsx";
import { useStoreInfo } from "../../lib/storeInfo.js";
import { useSignedIn } from "../../lib/useSignedIn.js";
import { useStoreCategories } from "../../lib/storeLinks.js";
import { categoryLabel } from "../../lib/categories.js";
import BackToTop from "../../components/ui/BackToTop.jsx";

// The store's Coming soon page (/coming-soon), when the merchant turned it
// on in Store settings: what's on its way, with an alert for each. Not
// found while it's off.
export default function StoreComingSoon() {
  const store = useStoreInfo();
  const signedIn = useSignedIn();
  const categories = useStoreCategories();
  const [params] = useSearchParams();
  const asked = params.get("category");
  const category = categories?.some((c) => c.key === asked) ? asked : null;

  if (store && !store.coming_soon) return <NotFound />;
  const storeName = store?.name || "this store";

  const chip = (key, label) => (
    <Link
      key={key || "all"}
      to={key ? `/coming-soon?category=${key}` : "/coming-soon"}
      aria-current={category === key ? "page" : undefined}
      className={`whitespace-nowrap text-sm px-3 py-2 rounded-md transition-colors ${
        category === key ? "bg-primary text-primary-text font-semibold shadow-sm" : "text-text hover:bg-text/10"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-bg text-text">
      <StoreHeader storeName={store?.name} />
      <BackToTop />
      <main className="pt-24 pb-16 px-4 md:px-10 max-w-6xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">Coming soon to {storeName}</h1>
        <p className="mt-2 mb-6 text-sm text-text-muted">
          On its way and not in stock yet. Set an alert and we&apos;ll tell you the moment it drops.
        </p>

        {categories?.length > 1 && (
          <nav aria-label="Categories" className="flex gap-1 p-1 mb-5 border border-text/15 rounded-lg bg-surface-muted w-fit max-w-full overflow-x-auto">
            {chip(null, "Everything")}
            {categories.map((c) => chip(c.key, categoryLabel(c.key, c.name)))}
          </nav>
        )}

        {store && <ComingSoonGrid category={category} signedIn={signedIn} otherName={store.other_category_name} />}
      </main>
      <StoreFooter storeName={store?.name} />
    </div>
  );
}
