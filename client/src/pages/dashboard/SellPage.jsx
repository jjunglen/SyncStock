import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuHandCoins, LuPlus, LuSearch, LuCamera, LuStore } from "react-icons/lu";
import DashboardNavbar from "../../components/layout/DashboardNavbar.jsx";
import BetaBadge from "../../components/ui/BetaBadge.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import AddPairs from "../../components/sell/AddPairs.jsx";
import BatchPairCard from "../../components/sell/BatchPairCard.jsx";
import SellRequestsList from "../../components/sell/SellRequestsList.jsx";
import api from "../../lib/api.js";

// /store/sell — "Sell your items" (beta) on a store's site. The shopper
// builds a batch (pairs + photos), picks cash or store credit and sends
// it; the store answers with an offer (Your requests tab).

const TABS = [
  { key: "batch", label: "Your batch" },
  { key: "requests", label: "Your requests" },
];

const STEPS = [
  { icon: LuSearch, title: "Add your pairs", text: "Find each item, tap every size you have." },
  { icon: LuCamera, title: "Snap photos", text: "2 for brand new, 4 for pre-owned." },
  { icon: LuStore, title: "Get an offer", text: "The store reviews and sends one offer." },
];

export default function SellPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "requests" ? "requests" : "batch";
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [adding, setAdding] = useState(false);
  const [payout, setPayout] = useState("cash");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api
        .get("/sell/requests")
        .then((res) => {
          setData(res.data.data);
          setLoadError("");
        })
        .catch((err) => setLoadError(err.response?.data?.message || "Couldn't load your batch. Try again.")),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const draft = data?.draft;
  const pairs = draft?.items || [];
  const short = pairs.filter((p) => p.photos.length < p.min_photos);
  const asking = pairs.reduce((sum, p) => sum + (p.asking_price || 0), 0);
  const creditBonus = data?.credit_bonus || 0;

  const send = async () => {
    if (short.length) {
      const p = short[0];
      setError(`Add ${p.min_photos - p.photos.length} more photo${p.min_photos - p.photos.length === 1 ? "" : "s"} of the ${p.product_name} (size ${p.size}).`);
      return;
    }
    setBusy("send");
    setError("");
    try {
      await api.post(`/sell/requests/${draft.id}/submit`, { payout_method: payout });
      await load();
      setParams({ tab: "requests" }, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send your batch. Try again.");
    } finally {
      setBusy("");
    }
  };

  const discard = async () => {
    setBusy("discard");
    try {
      await api.post(`/sell/requests/${draft.id}/cancel`);
      await load();
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text pb-24 lg:pb-0">
      <DashboardNavbar />
      <div className="pt-24 px-4 md:px-10 max-w-6xl mx-auto pb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded-full shrink-0">
            <LuHandCoins className="text-text" size={18} />
          </div>
          <div>
            <p className="text-base font-medium flex items-center gap-2">
              Sell your items <BetaBadge />
            </p>
            <p className="text-xs text-text-muted">Send the store your pairs and get an offer in cash or store credit</p>
          </div>
        </div>

        {!adding && (
          <div className="flex gap-2 mb-5" role="tablist" aria-label="Sell your items">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setParams({ tab: t.key }, { replace: true })}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  tab === t.key ? "bg-primary text-primary-text border-primary" : "border-border text-text hover:bg-text/5"
                }`}
              >
                {t.label}
                {t.key === "requests" && data?.requests?.some((r) => r.status === "offered") && (
                  <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-live align-middle" aria-label="Offer ready" />
                )}
              </button>
            ))}
          </div>
        )}

        {loadError && <p className="text-sm text-danger">{loadError}</p>}
        {!data && !loadError && <Spinner size={20} />}

        {data && adding && (
          <AddPairs
            onCancel={() => setAdding(false)}
            onAdded={(next) => {
              setData((d) => ({ ...d, draft: next }));
              setAdding(false);
            }}
          />
        )}

        {data && !adding && tab === "requests" && <SellRequestsList requests={data.requests} onChange={load} />}

        {data && !adding && tab === "batch" && (
          <div className="max-w-2xl">
            {!pairs.length ? (
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {STEPS.map(({ icon: Icon, title, text }, i) => (
                    <div key={title}>
                      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <Icon size={16} aria-hidden="true" />
                      </div>
                      <p className="text-sm font-semibold">
                        {i + 1}. {title}
                      </p>
                      <p className="text-xs text-text-muted">{text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Button variant="primary" size="lg" fullWidth onClick={() => setAdding(true)}>
                    <span className="flex items-center justify-center gap-2">
                      <LuPlus size={18} /> Add pairs
                    </span>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
                  <p className="text-sm text-text-muted">
                    {pairs.length} pair{pairs.length === 1 ? "" : "s"}
                    {asking > 0 && ` · asking $${asking.toLocaleString()}`}
                    {short.length > 0 && ` · ${short.length} need${short.length === 1 ? "s" : ""} photos`}
                  </p>
                  <button type="button" onClick={discard} disabled={!!busy} className="text-xs text-text-muted underline hover:text-text">
                    {busy === "discard" ? "Removing..." : "Start over"}
                  </button>
                </div>
                <div className="space-y-3">
                  {pairs.map((pair) => (
                    <BatchPairCard key={pair.id} pair={pair} onChange={load} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="mt-3 w-full rounded-2xl border border-dashed border-text/25 py-3 text-sm text-text-muted hover:text-text hover:border-text/50 flex items-center justify-center gap-2"
                >
                  <LuPlus size={16} /> Add more pairs
                </button>

                <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Get paid as</p>
                  <div role="radiogroup" aria-label="Get paid as" className="grid grid-cols-2 gap-1 p-1 border border-text/15 rounded-xl bg-surface-muted">
                    {[
                      { key: "cash", label: "Cash" },
                      ...(creditBonus > 0 ? [{ key: "credit", label: `Store credit +${creditBonus}%` }] : []),
                    ].map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        role="radio"
                        aria-checked={payout === o.key}
                        onClick={() => setPayout(o.key)}
                        className={`px-2 py-2 rounded-lg text-sm transition-colors ${payout === o.key ? "bg-primary text-primary-text font-semibold" : "text-text hover:bg-text/10"}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {error && <p className="mt-3 text-sm text-danger">{error}</p>}
                  <div className="mt-4">
                    <Button variant="primary" size="lg" fullWidth disabled={busy === "send"} onClick={send}>
                      {busy === "send" ? <Spinner size={18} /> : `Send ${pairs.length} pair${pairs.length === 1 ? "" : "s"} to the store`}
                    </Button>
                  </div>
                  <p className="mt-2 text-center text-xs text-text-muted">
                    The store reviews every pair and sends one offer. You can accept all or some. Photos are deleted once you drop the pairs off.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
