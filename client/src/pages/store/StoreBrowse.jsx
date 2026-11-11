import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LuSearch, LuChevronDown, LuBellRing } from "react-icons/lu";
import StoreHeader from "../../components/store/StoreHeader.jsx";
import StoreFooter from "../../components/store/StoreFooter.jsx";
import { getStoreCategories, categoryPath } from "../../lib/storeLinks.js";
import { searchAlertPath, canAlertSearch } from "../../lib/searchAlert.js";
import ProductTile from "../../components/store/ProductTile.jsx";
import SizeFilter from "../../components/dashboard/SizeFilter.jsx";
import BetaBadge from "../../components/ui/BetaBadge.jsx";
import Button from "../../components/ui/Button.jsx";
import api from "../../lib/api.js";
import { useStoreInfo } from "../../lib/storeInfo.js";
import { useSignedIn } from "../../lib/useSignedIn.js";
import { SIZES_BY_CATEGORY, BETA_CATEGORIES, categoryLabel } from "../../lib/categories.js";

// The store's public catalog (/browse): everything in stock, no account
// needed. Every filter lives in the address (?category=&q=&size=&page=),
// so pages can be shared and search engines can follow the page links.
// Only the plain /browse is indexed (components/Seo.jsx).

const PAGE_SIZE = 24;

const PRICE_RANGES = [
  { key: "", label: "Any price" },
  { key: "0-100", label: "Under $100", max: 100 },
  { key: "100-200", label: "$100 – $200", min: 100, max: 200 },
  { key: "200-300", label: "$200 – $300", min: 200, max: 300 },
  { key: "300-500", label: "$300 – $500", min: 300, max: 500 },
  { key: "500-", label: "$500+", min: 500 },
];

const SORTS = [
  { value: "", label: "Sort: Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const selectClass =
  "w-full appearance-none text-sm border border-border bg-surface text-text-muted pl-4 pr-9 py-2.5 rounded-lg focus:outline-none cursor-pointer";

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative flex-1 min-w-[8.5rem] sm:flex-none sm:min-w-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`${selectClass} ${value ? "text-text border-text/30" : ""}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <LuChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
    </div>
  );
}

export default function StoreBrowse() {
  const [params, setParams] = useSearchParams();
  const store = useStoreInfo();
  const signedIn = useSignedIn();

  const [categories, setCategories] = useState(null);
  const [brands, setBrands] = useState([]);
  // The last results, with the request they answer
  const [result, setResult] = useState(null);

  const q = params.get("q") || "";
  const sizeKey = params.get("size") || "";
  const brand = params.get("brand") || "";
  const price = params.get("price") || "";
  const sort = params.get("sort") || "";
  const page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  const asked = params.get("category");
  const category =
    categories && (categories.some((c) => c.key === asked) ? asked : categories[0]?.key || null);

  const [query, setQuery] = useState(q);
  // Back/forward: the box follows the address
  const [shownQ, setShownQ] = useState(q);
  if (q !== shownQ) {
    setShownQ(q);
    setQuery(q);
  }

  // Changes one or more filters; any filter change goes back to page 1
  const update = (changes, { replace = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace });
  };

  useEffect(() => {
    getStoreCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Typing updates the address after a short pause
  useEffect(() => {
    if (query === q) return;
    const timeout = setTimeout(() => update({ q: query.trim() }, { replace: true }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!category) return;
    api
      .get(`/inventory/brands?category=${encodeURIComponent(category)}`)
      .then((res) => setBrands(res.data.data || []))
      .catch(() => setBrands([]));
  }, [category]);

  const request = useMemo(() => {
    if (!category) return null;
    const search = new URLSearchParams({ category, page: String(page), limit: String(PAGE_SIZE) });
    if (q) search.set("q", q);
    if (sizeKey) search.set("size", sizeKey);
    if (brand) search.set("brand", brand);
    if (sort) search.set("sort", sort);
    const range = PRICE_RANGES.find((r) => r.key === price);
    if (range?.min != null) search.set("min_price", String(range.min));
    if (range?.max != null) search.set("max_price", String(range.max));
    return search.toString();
  }, [category, page, q, sizeKey, brand, price, sort]);

  useEffect(() => {
    if (!request) return;
    let active = true;
    api
      .get(`/inventory/search?${request}`)
      .then((res) => active && setResult({ request, items: res.data.data || [], meta: res.data.meta || null }))
      .catch(() => active && setResult({ request, items: [], meta: null }));
    return () => {
      active = false;
    };
  }, [request]);

  // Still loading: categories, or the results for this request
  const loading = categories === null || (!!request && result?.request !== request);
  const items = (request && result?.items) || [];
  const meta = request ? result?.meta : null;

  const storeName = store?.name || "this store";
  const sizes = SIZES_BY_CATEGORY[category] || [];
  const selectedSizes = sizeKey ? sizeKey.split(",") : [];
  const filtersActive = !!(q || sizeKey || brand || price);

  const brandChoices =
    brand && !brands.some((b) => b.brand === brand) ? [{ brand, count: 0 }, ...brands] : brands;

  const pageLink = (n) => {
    const next = new URLSearchParams(params);
    if (n > 1) next.set("page", String(n));
    else next.delete("page");
    const s = next.toString();
    return `/browse${s ? `?${s}` : ""}`;
  };
  const categoryLink = (key) => categoryPath(key, categories);

  return (
    <div className="min-h-screen bg-bg text-text">
      <StoreHeader storeName={store?.name} />

      <main className="pt-24 px-4 md:px-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold">
              {/* A category's own page names it (matches its search title) */}
              {category && categories?.length > 1 && category !== categories[0].key
                ? `${categoryLabel(category, categories.find((c) => c.key === category)?.name)} at ${storeName}`
                : `Shop ${storeName}`}
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              {meta && category ? `${meta.total} in stock right now` : "Everything in stock right now"}
            </p>
          </div>
          {signedIn === false && (
            <Button to="/store/signup" variant="secondary" size="sm" className="hidden sm:inline-flex">
                <span className="flex items-center justify-center gap-2"><LuBellRing size={14} /> Get alerts in your size</span>
              </Button>
          )}
        </div>

        {/* Categories: real links, so each one can be shared and crawled */}
        {categories?.length > 1 && (
          <nav aria-label="Categories" className="flex gap-1 p-1 mb-5 border border-text/15 rounded-lg bg-surface-muted w-fit max-w-full overflow-x-auto">
            {categories.map((c) => (
              <Link
                key={c.key}
                to={categoryLink(c.key)}
                aria-current={category === c.key ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap text-sm px-3 py-2 rounded-md transition-colors ${
                  category === c.key ? "bg-primary text-primary-text font-semibold shadow-sm" : "text-text hover:bg-text/10"
                }`}
              >
                {categoryLabel(c.key, c.name)}
                {BETA_CATEGORIES.includes(c.key) && <BetaBadge size="xs" />}
                <span className={`text-xs ${category === c.key ? "text-primary-text/70" : "text-text-muted"}`}>{c.count}</span>
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${storeName}`}
              aria-label="Search"
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text/10"
            />
          </div>
          {sizes.length > 0 && (
            <div className="flex-1 min-w-[8.5rem] sm:flex-none sm:min-w-0">
              <SizeFilter value={selectedSizes} onChange={(list) => update({ size: list.join(",") })} sizes={sizes} />
            </div>
          )}
          <FilterSelect
            label="Brand"
            value={brand}
            onChange={(v) => update({ brand: v })}
            options={[
              { value: "", label: "All brands" },
              ...brandChoices.map((b) => ({ value: b.brand, label: b.count ? `${b.brand} (${b.count})` : b.brand })),
            ]}
          />
          <FilterSelect
            label="Price"
            value={price}
            onChange={(v) => update({ price: v })}
            options={PRICE_RANGES.map((r) => ({ value: r.key, label: r.label }))}
          />
          <FilterSelect label="Sort" value={sort} onChange={(v) => update({ sort: v })} options={SORTS} />
          {filtersActive && (
            <button
              onClick={() => {
                setQuery("");
                update({ q: "", size: "", brand: "", price: "" });
              }}
              className="text-sm text-text-muted hover:text-text underline whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>

        {!loading && meta?.match === "close" && q && (
          <p className="text-sm text-text-muted mb-4">
            No exact matches for <span className="text-text">“{q}”</span>. Showing close matches.
            {canAlertSearch(q, category) && signedIn !== null && (
              <>
                {" "}
                <Link to={searchAlertPath(q, category, signedIn)} rel="nofollow" className="text-text underline">
                  Get an alert when “{q}” is in
                </Link>
              </>
            )}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-text-muted mb-4">
              {q ? (
                <>
                  Nothing in stock matches <span className="text-text">“{q}”</span> right now.
                </>
              ) : filtersActive ? (
                "Nothing in stock matches that right now."
              ) : (
                "Nothing in stock right now."
              )}
            </p>
            {/* A search that found nothing becomes an alert for it */}
            {canAlertSearch(q, category) ? (
              <Button to={searchAlertPath(q, category, signedIn)} rel="nofollow" variant="primary">
                <span className="flex items-center justify-center gap-2">
                  <LuBellRing size={16} /> Alert me when “{q}” is in
                </span>
              </Button>
            ) : (
              <Button to="/store/signup" variant="primary">Get an alert when it lands</Button>
            )}
            {filtersActive && (
              <p className="mt-4 text-sm">
                <button
                  onClick={() => {
                    setQuery("");
                    update({ q: "", size: "", brand: "", price: "" });
                  }}
                  className="text-text-muted hover:text-text underline"
                >
                  Clear search and filters
                </button>
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <ProductTile key={item.id} item={item} />
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <nav aria-label="Pages" className="flex items-center justify-between mt-8">
                {page > 1 ? (
                  <Link to={pageLink(page - 1)} rel="prev" className="text-sm text-text-muted hover:text-text">
                    Previous
                  </Link>
                ) : (
                  <span className="text-sm text-text-muted opacity-30">Previous</span>
                )}
                <span className="text-xs text-text-muted">
                  Page {meta.page} of {meta.totalPages}
                </span>
                {page < meta.totalPages ? (
                  <Link to={pageLink(page + 1)} rel="next" className="text-sm text-text-muted hover:text-text">
                    Next
                  </Link>
                ) : (
                  <span className="text-sm text-text-muted opacity-30">Next</span>
                )}
              </nav>
            )}
          </>
        )}

        {signedIn === false && (
          <div className="mt-14 rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center">
            <h2 className="font-display text-2xl font-semibold">Not in your size?</h2>
            <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
              Save your sizes and we'll tell you the moment something you want is back at {storeName}. Free, and takes 30 seconds.
            </p>
            <Button to="/store/signup" variant="primary" className="mt-5">Get restock alerts</Button>
          </div>
        )}
      </main>
      <div className="mt-20">
        <StoreFooter storeName={store?.name} />
      </div>
    </div>
  );
}
