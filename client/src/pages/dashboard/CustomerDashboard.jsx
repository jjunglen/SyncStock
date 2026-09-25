import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LuSearch,
  LuChevronDown,
  LuLayoutDashboard,
  LuBell,
  LuTrash2,
  LuPlus,
} from "react-icons/lu";
import DashboardNavbar from "../../components/layout/DashboardNavbar.jsx";
import ProductCard from "../../components/dashboard/ProductCard.jsx";
import ProductModal from "../../components/dashboard/ProductModal.jsx";
import Button from "../../components/ui/Button.jsx";
import {
  ContainerToggle,
  CellToggle,
} from "../../components/ui/AnimatedToggleLayout.jsx";
import api from "../../lib/api.js";
import { CATEGORY_META, SIZES_BY_CATEGORY } from "../../lib/categories.js";

const TABS = [
  { key: "instock", label: "In stock" },
  { key: "browse", label: "Browse inventory" },
  { key: "alerts", label: "Your alerts" },
];

const PAGE_SIZE = 24;

export default function CustomerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("instock");
  const [selectedItem, setSelectedItem] = useState(null);

  // Categories this store carries (only those get a tab)
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(
    () => new URLSearchParams(location.search).get("category") || "sneakers",
  );

  const [inStockItems, setInStockItems] = useState([]);
  const [inStockMeta, setInStockMeta] = useState(null);
  const [inStockPage, setInStockPage] = useState(1);
  const [loadingInStock, setLoadingInStock] = useState(true);
  const [mySizes, setMySizes] = useState([]);

  const [browseItems, setBrowseItems] = useState([]);
  const [browseMeta, setBrowseMeta] = useState(null);
  const [browsePage, setBrowsePage] = useState(1);
  const [loadingBrowse, setLoadingBrowse] = useState(true);
  const [browseQuery, setBrowseQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSize, setSelectedSize] = useState("All sizes");

  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    api
      .get("/inventory/categories")
      .then((res) => {
        const list = res.data.data || [];
        setCategories(list);
        // Stay on the current category only if this store carries it
        if (list.length > 0 && !list.some((c) => c.key === category)) {
          setCategory(list[0].key);
        }
      })
      .catch((err) => console.error("Failed to load categories:", err));
    // Runs once — `category` is only read to validate the initial value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeCategory = (key) => {
    setCategory(key);
    setInStockPage(1);
    setBrowsePage(1);
    setSelectedSize("All sizes");
  };

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setMySizes(res.data.data.sizes || []))
      .catch((err) => console.error("Failed to load account:", err));
  }, []);

  const fetchInStock = useCallback((page, cat) => {
    setLoadingInStock(true);
    api
      .get(`/inventory/my-sizes?category=${cat}&page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => {
        setInStockItems(res.data.data || []);
        setInStockMeta(res.data.meta || null);
      })
      .catch((err) => console.error("Failed to load in-stock items:", err))
      .finally(() => setLoadingInStock(false));
  }, []);

  useEffect(() => {
    fetchInStock(inStockPage, category);
  }, [inStockPage, category, fetchInStock]);

  const fetchBrowse = useCallback((page, query, size, cat) => {
    setLoadingBrowse(true);
    const params = new URLSearchParams({
      category: cat,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (query) params.set("q", query);
    if (size && size !== "All sizes") params.set("size", size);

    api
      .get(`/inventory/search?${params.toString()}`)
      .then((res) => {
        setBrowseItems(res.data.data || []);
        setBrowseMeta(res.data.meta || null);
      })
      .catch((err) => console.error("Failed to load inventory:", err))
      .finally(() => setLoadingBrowse(false));
  }, []);

  // Debounce raw typing into debouncedQuery
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(browseQuery), 300);
    return () => clearTimeout(timeout);
  }, [browseQuery]);

  // A real filter change (query or size) always resets to page 1
  useEffect(() => {
    setBrowsePage(1);
  }, [debouncedQuery, selectedSize]);

  // Single source of truth: any change to page, query, or size
  // triggers exactly one fetch — Previous/Next just changes browsePage
  // and this picks it up the same way a filter change does.
  useEffect(() => {
    fetchBrowse(browsePage, debouncedQuery, selectedSize, category);
  }, [browsePage, debouncedQuery, selectedSize, category, fetchBrowse]);

  useEffect(() => {
    api
      .get("/alerts")
      .then((res) => setAlerts(res.data.data.alerts || []))
      .catch((err) => console.error("Failed to load alerts:", err))
      .finally(() => setLoadingAlerts(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemId = params.get("item");
    if (!itemId) return;

    api
      .get(`/inventory/${itemId}`)
      .then((res) => setSelectedItem(res.data.data))
      .catch((err) => console.error("Failed to load item from link:", err));
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam && TABS.some((t) => t.key === tabParam)) {
      setTab(tabParam);
    }
  }, [location.search]);

  const closeModal = () => {
    setSelectedItem(null);
    const params = new URLSearchParams(location.search);
    params.delete("item");
    params.delete("alert");
    const newSearch = params.toString();
    navigate(`/store/dashboard${newSearch ? `?${newSearch}` : ""}`, {
      replace: true,
    });
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  const categorySizes = SIZES_BY_CATEGORY[category] || [];
  const availableSizes = ["All sizes", ...categorySizes];
  const mySizesHere = mySizes.filter((s) => categorySizes.includes(s));
  const isCards = category === "trading_cards";
  const showSwitcher = categories.length > 1;

  // One switch, laid out vertically in the left column on desktop and
  // as a full-width row under the tabs on phones
  const categorySwitch = (vertical) => (
    <div
      role="tablist"
      aria-label="Category"
      className={`flex ${vertical ? "flex-col" : ""} border border-border rounded-lg overflow-hidden bg-surface`}
    >
      {categories.map((c) => (
        <button
          key={c.key}
          role="tab"
          aria-selected={category === c.key}
          onClick={() => changeCategory(c.key)}
          className={`flex items-center gap-2 text-sm px-3 py-2.5 transition-colors ${vertical ? "justify-between text-left" : "flex-1 justify-center text-center leading-tight"} ${
            category === c.key
              ? "bg-primary/10 text-text font-medium"
              : "text-text-muted hover:text-text hover:bg-text/5"
          }`}
        >
          {CATEGORY_META[c.key]?.label || c.key}
          {vertical && <span className="text-xs text-text-muted">{c.count}</span>}
        </button>
      ))}
    </div>
  );

  const sizeFilter = categorySizes.length > 0 && (
    <div className="relative">
      <select
        value={selectedSize}
        onChange={(e) => setSelectedSize(e.target.value)}
        aria-label="Size"
        className="w-full appearance-none text-sm border border-border bg-surface text-text-muted pl-4 pr-9 py-2.5 rounded-lg focus:outline-none cursor-pointer"
      >
        {availableSizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <LuChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        size={14}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text pb-20">
      <DashboardNavbar />

      {selectedItem && (
        <ProductModal item={selectedItem} onClose={closeModal} />
      )}

      <div className="pt-16">
        <div className="flex border-b border-border px-4 md:px-10 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm py-4 mr-6 border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "text-text border-primary font-medium"
                  : "text-text-muted border-transparent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {showSwitcher && (
          <div className="lg:hidden px-4 md:px-10 pt-4">{categorySwitch(false)}</div>
        )}

        <div className="px-4 md:px-10 py-6 max-w-6xl mx-auto lg:flex lg:gap-8">
          {showSwitcher && (
            <aside className="hidden lg:flex flex-col gap-6 w-48 shrink-0">
              {categorySwitch(true)}
              {tab === "browse" && sizeFilter && (
                <div>
                  <p className="text-xs text-text-muted mb-2">Size</p>
                  {sizeFilter}
                </div>
              )}
            </aside>
          )}

          <div className="flex-1 min-w-0">
          {tab === "instock" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LuLayoutDashboard size={18} className="text-text" />
                  </div>
                  <div>
                    <p className="text-base font-medium">
                      {isCards
                        ? "Trading cards in stock"
                        : `${CATEGORY_META[category]?.label || "Items"} in your sizes`}
                    </p>
                    {!isCards && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {mySizesHere.length > 0 ? (
                        mySizesHere.map((size) => (
                          <span
                            key={size}
                            className="text-xs bg-surface border border-border text-text-muted py-1 px-2.5 rounded-full"
                          >
                            {size}
                          </span>
                        ))
                      ) : (
                        <Link
                          to="/store/profile"
                          className="text-xs text-text-muted hover:text-text underline"
                        >
                          No {CATEGORY_META[category]?.sizeName} sizes saved yet — add them
                        </Link>
                      )}
                    </div>
                    )}
                  </div>
                </div>
                {category === "sneakers" && (
                <Link
                  to="/store/track"
                  className="flex items-center gap-2 bg-primary/10 text-text text-sm px-4 py-2.5 rounded-lg hover:bg-primary/15 transition-colors"
                >
                  <LuPlus size={16} /> Track a new shoe
                </Link>
                )}
              </div>

              {loadingInStock ? (
                <p className="text-text-muted text-sm">Loading...</p>
              ) : inStockItems.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-text-muted text-sm mb-2">
                    Nothing in stock in your size right now
                  </p>
                  <p className="text-text-muted text-xs">
                    Set an alert to get notified when something drops
                  </p>
                </div>
              ) : (
                <>
                  <ContainerToggle>
                    {inStockItems.map((item) => (
                      <CellToggle
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                      >
                        <ProductCard item={item} />
                      </CellToggle>
                    ))}
                  </ContainerToggle>

                  {inStockMeta && inStockMeta.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <button
                        disabled={inStockPage <= 1}
                        onClick={() => setInStockPage((p) => p - 1)}
                        className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-text-muted">
                        Page {inStockMeta.page} of {inStockMeta.totalPages}
                      </span>
                      <button
                        disabled={inStockPage >= inStockMeta.totalPages}
                        onClick={() => setInStockPage((p) => p + 1)}
                        className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === "browse" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LuSearch size={18} className="text-text" />
                  </div>
                  <div>
                    <p className="text-base font-medium">Browse inventory</p>
                    <p className="text-xs text-text-muted">
                      {browseMeta
                        ? `${browseMeta.total} in stock right now`
                        : ""}
                    </p>
                  </div>
                </div>
                {category === "sneakers" && (
                <Link
                  to="/store/track"
                  className="flex items-center gap-2 bg-primary/10 text-text text-sm px-4 py-2.5 rounded-lg hover:bg-primary/15 transition-colors"
                >
                  <LuPlus size={16} /> Track a new shoe
                </Link>
                )}
              </div>

              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <LuSearch
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    size={16}
                  />
                  <input
                    type="text"
                    value={browseQuery}
                    onChange={(e) => setBrowseQuery(e.target.value)}
                    placeholder="Search inventory"
                    className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text/10"
                  />
                </div>
                {sizeFilter && (
                  <div className={showSwitcher ? "lg:hidden" : ""}>{sizeFilter}</div>
                )}
              </div>

              {loadingBrowse ? (
                <p className="text-text-muted text-sm">Loading...</p>
              ) : browseItems.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-text-muted text-sm">No results found</p>
                </div>
              ) : (
                <>
                  <ContainerToggle>
                    {browseItems.map((item) => (
                      <CellToggle
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                      >
                        <ProductCard item={item} />
                      </CellToggle>
                    ))}
                  </ContainerToggle>

                  {browseMeta && browseMeta.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <button
                        disabled={browsePage <= 1}
                        onClick={() => setBrowsePage((p) => p - 1)}
                        className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-text-muted">
                        Page {browseMeta.page} of {browseMeta.totalPages}
                      </span>
                      <button
                        disabled={browsePage >= browseMeta.totalPages}
                        onClick={() => setBrowsePage((p) => p + 1)}
                        className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === "alerts" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <LuBell size={18} className="text-text" />
                  </div>
                  <div>
                    <p className="text-base font-medium">
                      <span className="text-text font-semibold">
                        {alerts.length}
                      </span>{" "}
                      shoes tracked
                    </p>
                    <p className="text-xs text-text-muted">
                      We'll notify you the second they drop
                    </p>
                  </div>
                </div>
                <Link
                  to="/store/track"
                  className="flex items-center gap-2 bg-primary/10 text-text text-sm px-4 py-2.5 rounded-lg hover:bg-primary/15 transition-colors"
                >
                  <LuPlus size={16} /> Track a new shoe
                </Link>
              </div>

              {loadingAlerts ? (
                <p className="text-text-muted text-sm">Loading...</p>
              ) : alerts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-text-muted text-sm mb-4">No alerts yet</p>
                  <Link to="/store/track">
                    <Button variant="primary">Track your first shoe</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {alert.product_name}
                        </p>
                        <p className="text-xs text-text-muted">{alert.size}</p>
                        {alert.max_price && (
                          <p className="text-xs text-text-muted">
                            Max ${parseFloat(alert.max_price).toFixed(0)}
                          </p>
                        )}
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${alert.active ? "bg-live/10 text-live" : "bg-text/5 text-text-muted"}`}
                        >
                          {alert.active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="text-text-muted hover:text-danger transition-colors shrink-0"
                      >
                        <LuTrash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
