import { useState, useEffect, useCallback } from "react";
import { LuUsers, LuSearch, LuTrash2 } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import api from "../../lib/api.js";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (query) params.set("q", query);
    api
      .get(`/store/customers?${params.toString()}`)
      .then((res) => {
        setCustomers(res.data.data || []);
        setMeta(res.data.meta);
      })
      .catch(() => setError("Failed to load customers"))
      .finally(() => setLoading(false));
  }, [page, query]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustomers, 300); // debounce search
    return () => clearTimeout(timeout);
  }, [fetchCustomers]);

  const handleRemove = async (id) => {
    try {
      await api.delete(`/store/customers/${id}`);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setConfirmingId(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove customer");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar />

      <div className="flex-1 p-6 overflow-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LuUsers size={18} className="text-text" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Customers</h1>
        </div>
        <p className="text-text-muted text-sm mb-6">
          Everyone with an account on your store.
        </p>

        <div className="relative mb-4">
          <LuSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            size={16}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email"
            className="w-full pl-10 pr-4 py-2.5 bg-surface-muted border border-border rounded-xl text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-white/10"
          />
        </div>

        {error && <p className="text-danger text-xs mb-4">{error}</p>}

        {loading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-border bg-surface">
            <p className="text-sm text-text-muted">
              {query ? "No matches found." : "No customers yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              {customers.map((c, idx) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between px-5 py-4 ${idx !== customers.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium">{c.full_name || "—"}</p>
                    <p className="text-xs text-text-muted">{c.email}</p>
                  </div>

                  {confirmingId === c.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Remove?</span>
                      <button
                        onClick={() => handleRemove(c.id)}
                        className="text-xs text-danger font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="text-xs text-text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(c.id)}
                      className="text-text-muted hover:text-danger transition-colors"
                    >
                      <LuTrash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-xs text-text-muted">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-sm text-text-muted hover:text-text disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
