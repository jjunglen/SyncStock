import { useCallback, useEffect, useState } from "react";
import { LuFootprints, LuX, LuInbox } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import AuthPhoto from "../sell/AuthPhoto.jsx";
import { Confidence } from "./PriceGuide.jsx";
import api from "../../lib/api.js";
import { sellItemDetails, sellItemShort } from "../../lib/sellLabels.js";

// Buy requests (merchant): batches shoppers sent. Open ones get an offer
// per pair (pre-filled with the price guide's suggestion), accepted ones
// get checked in when the pairs arrive.

const VIEWS = [
  { key: "open", label: "Needs an offer" },
  { key: "accepted", label: "Coming in" },
  { key: "done", label: "Done" },
];
const STATUS = {
  submitted: ["Needs an offer", "bg-primary/10 text-text"],
  offered: ["Offer sent — waiting", "bg-warn/10 text-warn"],
  accepted: ["Accepted — bring in", "bg-live/10 text-live"],
  received: ["Received and paid", "bg-live/10 text-live"],
  declined: ["Declined", "bg-text/5 text-text-muted"],
  expired: ["Expired", "bg-text/5 text-text-muted"],
  cancelled: ["Cancelled by shopper", "bg-text/5 text-text-muted"],
};
const money = (n) => (n === null || n === undefined || n === "" || Number.isNaN(Number(n)) ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
const when = (d) => (d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const withBonus = (n, r) => (r.payout_method === "credit" ? n * (1 + r.credit_bonus / 100) : n);

function Lightbox({ photo, onClose }) {
  if (!photo) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-label="Photo">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-10 max-h-full max-w-3xl w-full">
        <button type="button" onClick={onClose} aria-label="Close photo" className="absolute -top-10 right-0 text-white p-2">
          <LuX size={22} />
        </button>
        <AuthPhoto url={photo.url} alt="" className="w-full max-h-[80vh] rounded-xl object-contain bg-black" />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-surface-muted px-3 py-2 min-w-0">
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  );
}

function RequestCard({ request, onChange }) {
  const editable = ["submitted", "offered"].includes(request.status);
  const [offers, setOffers] = useState(() =>
    Object.fromEntries(
      request.items.map((i) => [
        i.id,
        {
          on: request.status === "submitted" ? true : !i.offer_skipped,
          price: String(i.offer_price ?? i.suggested_offer ?? ""),
        },
      ]),
    ),
  );
  const [message, setMessage] = useState(request.merchant_message || "");
  const [arrived, setArrived] = useState(() => new Set(request.items.filter((i) => i.decision === "accepted").map((i) => i.id)));
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [status, statusClass] = STATUS[request.status] || STATUS.submitted;
  const credit = request.payout_method === "credit";

  const live = request.items.filter((i) => offers[i.id].on);
  const cashTotal = live.reduce((sum, i) => sum + (Number(offers[i.id].price) || 0), 0);
  const expected = live.reduce((sum, i) => sum + (i.suggestion?.typical_payout || 0), 0);

  const act = async (key, request_, success) => {
    setBusy(key);
    setError("");
    try {
      const res = await request_();
      setDone(typeof success === "function" ? success(res) : success);
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setBusy("");
    }
  };

  const sendOffer = () => {
    // A ticked pair with no price would be sent as "not buying"
    const unpriced = live.find((i) => !(Number(offers[i.id].price) > 0));
    if (unpriced) {
      setError(`Enter an offer for the ${unpriced.product_name} (${sellItemShort(unpriced)}), or untick it.`);
      return;
    }
    return act(
      "offer",
      () =>
        api.post(`/sell/store/requests/${request.id}/offer`, {
          items: request.items.map((i) => ({ id: i.id, offer_price: offers[i.id].on ? offers[i.id].price : null })),
          message,
        }),
      "Offer sent",
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {request.shopper} · {request.items.length} pair{request.items.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-text-muted">
            Sent {when(request.submitted_at)} · wants {credit ? `store credit (+${request.credit_bonus}%)` : "cash"} · photos deleted after drop-off
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full ${statusClass}`}>{status}</span>
      </div>

      <div className="mt-4 space-y-3">
        {request.items.map((item) => {
          const s = item.suggestion;
          const o = offers[item.id];
          const showItem = editable || request.status !== "accepted" || item.decision === "accepted";
          if (!showItem) return null;
          return (
            <div key={item.id} className={`rounded-xl border border-border p-3 transition-opacity ${editable && !o.on ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                  {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-contain" /> : <LuFootprints className="text-neutral-300" size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{item.product_name}</p>
                  <p className="text-xs text-text-muted">
                    {[item.style_code || "No SKU", ...sellItemDetails(item)].join(" · ")}
                    {item.notes && ` · “${item.notes}”`}
                  </p>
                </div>
                {editable && (
                  <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={o.on}
                      onChange={(e) => setOffers((prev) => ({ ...prev, [item.id]: { ...prev[item.id], on: e.target.checked } }))}
                    />
                    Make an offer
                  </label>
                )}
                {request.status === "accepted" && (
                  <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={arrived.has(item.id)}
                      onChange={(e) =>
                        setArrived((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        })
                      }
                    />
                    Came in
                  </label>
                )}
              </div>

              {item.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.photos.map((p, i) => (
                    <button key={p.id} type="button" onClick={() => setPhoto(p)} aria-label={`Open photo ${i + 1}`} className="h-16 w-16 overflow-hidden rounded-lg">
                      <AuthPhoto url={p.url} className="h-full w-full" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Shopper asks" value={money(item.asking_price)} />
                <Stat label="Typical payout" value={money(s?.typical_payout)} />
                <Stat label="Sells in" value={s?.days_to_sell != null ? `~${s.days_to_sell} days` : "—"} />
                <Stat label={`Suggested (${s?.margin ?? "—"}%)`} value={money(item.suggested_offer)} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Confidence value={s?.confidence || "none"} sales={s?.based_on} />
                {editable ? (
                  <label className="flex items-center gap-2 text-xs text-text-muted">
                    Your offer
                    <span className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
                      <input
                        inputMode="decimal"
                        disabled={!o.on}
                        value={o.price}
                        onChange={(e) => setOffers((prev) => ({ ...prev, [item.id]: { ...prev[item.id], price: e.target.value.replace(/[^0-9.]/g, "") } }))}
                        aria-label={`Offer for ${item.product_name} ${sellItemShort(item)}`}
                        className="w-24 rounded-lg border border-border bg-surface-muted py-1.5 pl-6 pr-2 text-right text-sm text-text focus:outline-none focus:ring-2 focus:ring-text/10"
                      />
                    </span>
                    {o.on && s?.typical_payout ? <span>{Math.round((1 - (Number(o.price) || 0) / s.typical_payout) * 100)}% margin</span> : null}
                  </label>
                ) : (
                  <p className="text-sm">
                    {item.offer_skipped ? (
                      <span className="text-text-muted">Not buying</span>
                    ) : (
                      <>
                        Offer <span className="font-semibold">{money(item.offer_price)}</span>
                        {item.paid_price !== null && <span className="text-text-muted"> · paid {money(item.paid_price)}</span>}
                        {item.decision === "declined" && <span className="text-text-muted"> · shopper declined</span>}
                        {item.decision === "no_show" && <span className="text-text-muted"> · didn't come in</span>}
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editable && (
        <div className="mt-4 border-t border-border pt-4 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-xs text-text-muted">
              {live.length} of {request.items.length} pairs
              {expected > 0 && ` · expected payout ${money(expected)} · margin ${Math.round((1 - cashTotal / expected) * 100)}%`}
            </p>
            <p className="text-right">
              <span className="block text-xs text-text-muted">Batch offer</span>
              <span className="text-xl font-bold">
                {money(withBonus(cashTotal, request))} {credit ? "credit" : "cash"}
              </span>
              {credit && <span className="block text-xs text-text-muted">{money(cashTotal)} + {request.credit_bonus}% credit bonus</span>}
            </p>
          </div>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            placeholder="Message to the shopper (optional)"
            aria-label="Message to the shopper"
            className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-text/10"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => act("decline", () => api.post(`/sell/store/requests/${request.id}/decline`, { message }), "Declined")}>
              {busy === "decline" ? <Spinner size={14} /> : "Decline batch"}
            </Button>
            <Button variant="primary" size="sm" disabled={!!busy || !live.length} onClick={sendOffer}>
              {busy === "offer" ? <Spinner size={14} /> : request.status === "offered" ? "Update offer" : `Send offer · ${money(withBonus(cashTotal, request))}`}
            </Button>
          </div>
        </div>
      )}

      {request.status === "accepted" && (
        <div className="mt-4 border-t border-border pt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-muted">
            When the pairs come in, check them in. {credit && "Issue the store credit in Shopify or your POS. "}Photos are deleted.
          </p>
          <Button
            variant="primary"
            size="sm"
            disabled={!!busy || !arrived.size}
            onClick={() =>
              act("received", () => api.post(`/sell/store/requests/${request.id}/received`, { items: [...arrived] }), (res) =>
                `Checked in — ${credit ? "issue" : "pay"} ${money(res.data.data.paid_total)}${credit ? " in store credit" : " cash"}`,
              )
            }
          >
            {busy === "received" ? <Spinner size={14} /> : `Mark ${arrived.size} received`}
          </Button>
        </div>
      )}

      {request.status === "received" && (
        <p className="mt-3 text-xs text-text-muted">
          Paid {money(request.items.reduce((s, i) => s + (i.paid_price || 0), 0))} {credit ? "in store credit" : "cash"} · received {when(request.received_at)}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {done && <p className="mt-2 text-sm text-live">{done}</p>}
      <Lightbox photo={photo} onClose={() => setPhoto(null)} />
    </div>
  );
}

export default function BuyRequestsList() {
  const [view, setView] = useState("open");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api
        .get("/sell/store/requests", { params: { view } })
        .then((res) => {
          setData(res.data.data);
          setError("");
        })
        .catch((err) => setError(err.response?.data?.message || "Couldn't load buy requests.")),
    [view],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Buy request status">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            onClick={() => {
              setData(null);
              setView(v.key);
            }}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              view === v.key ? "border-text bg-text text-bg" : "border-border text-text-muted hover:text-text"
            }`}
          >
            {v.label}
            {data?.counts?.[v.key] > 0 && <span className="ml-1.5 text-xs opacity-70">{data.counts[v.key]}</span>}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!data && !error && <Spinner size={20} />}
      {data && data.requests.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <LuInbox size={24} className="mx-auto mb-2 text-text-muted" aria-hidden="true" />
          <p className="text-sm text-text-muted">
            {view === "open" ? "No requests waiting. Turn on Sell your items in Store settings so shoppers can send items." : "Nothing here yet."}
          </p>
        </div>
      )}
      <div className="space-y-4">
        {data?.requests.map((r) => (
          <RequestCard key={`${r.id}-${r.status}-${r.offered_at || ""}`} request={r} onChange={load} />
        ))}
      </div>
    </div>
  );
}
