import { useState } from "react";
import { LuFootprints } from "react-icons/lu";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";
import api from "../../lib/api.js";

// The shopper's sent batches: where each one stands, and the store's offer
// to accept (all or some pairs) or decline.
//   requests — from GET /sell/requests; onChange() reloads

const STATUS = {
  submitted: { label: "Waiting for the store", className: "bg-text/5 text-text-muted" },
  offered: { label: "Offer ready", className: "bg-primary/10 text-text" },
  accepted: { label: "Accepted — bring them in", className: "bg-live/10 text-live" },
  received: { label: "Done — paid", className: "bg-live/10 text-live" },
  declined: { label: "Declined", className: "bg-text/5 text-text-muted" },
  expired: { label: "Expired", className: "bg-text/5 text-text-muted" },
  cancelled: { label: "Cancelled", className: "bg-text/5 text-text-muted" },
};
const CONDITION = { new: "brand new", used: "pre-owned" };
const money = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const when = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");

// What the shopper gets for an offer: cash, or credit with the bonus
const payout = (offer, request) =>
  offer === null || offer === undefined ? null : request.payout_method === "credit" ? Math.round(offer * (1 + request.credit_bonus / 100) * 100) / 100 : offer;

function RequestCard({ request, onChange }) {
  const offered = request.items.filter((i) => !i.offer_skipped && i.offer_price !== null);
  const [chosen, setChosen] = useState(() => new Set(offered.map((i) => i.id)));
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const status = STATUS[request.status] || STATUS.submitted;
  const kind = request.payout_method === "credit" ? "store credit" : "cash";
  const total = offered.filter((i) => chosen.has(i.id)).reduce((sum, i) => sum + payout(i.offer_price, request), 0);

  const respond = async (accept) => {
    setBusy(accept.length ? "accept" : "decline");
    setError("");
    try {
      await api.post(`/sell/requests/${request.id}/respond`, { accept });
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send your answer. Try again.");
    } finally {
      setBusy("");
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      await api.post(`/sell/requests/${request.id}/cancel`);
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't cancel. Try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {request.items.length} item{request.items.length === 1 ? "" : "s"} · {kind}
          </p>
          <p className="text-xs text-text-muted">Sent {when(request.submitted_at || request.created_at)}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full ${status.className}`}>{status.label}</span>
      </div>

      {request.merchant_message && request.status !== "submitted" && (
        <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-sm">“{request.merchant_message}”</p>
      )}

      <ul className="mt-3 divide-y divide-border">
        {request.items.map((item) => {
          const value = payout(item.offer_price, request);
          const offeredItem = !item.offer_skipped && item.offer_price !== null;
          return (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              {picking && request.status === "offered" && offeredItem && (
                <input
                  type="checkbox"
                  aria-label={`Sell ${item.product_name} size ${item.size}`}
                  checked={chosen.has(item.id)}
                  onChange={(e) =>
                    setChosen((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    })
                  }
                  className="h-4 w-4 accent-current"
                />
              )}
              <div className="h-10 w-10 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-contain" /> : <LuFootprints className="text-neutral-300" size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-text-muted">
                  Size {item.size} · {CONDITION[item.condition]}
                  {item.decision === "declined" && " · not selling"}
                  {item.paid_price !== null && ` · paid ${money(item.paid_price)}`}
                </p>
              </div>
              <span className="text-sm font-semibold whitespace-nowrap">
                {request.status === "submitted" || request.status === "cancelled"
                  ? ""
                  : offeredItem
                    ? money(value)
                    : <span className="text-xs font-normal text-text-muted">Not buying</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {request.status === "offered" && (
        <div className="mt-3 border-t border-border pt-3">
          {offered.length === 0 ? (
            <p className="text-sm text-text-muted">The store isn't buying any of these.</p>
          ) : (
            <p className="text-sm">
              {picking ? "You'd get " : "Offer: "}
              <span className="font-semibold">
                {money(total)} {kind}
              </span>
              {picking && ` for ${chosen.size} item${chosen.size === 1 ? "" : "s"}`}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {offered.length > 0 && (
              <Button variant="primary" size="sm" disabled={!!busy || (picking && chosen.size === 0)} onClick={() => respond(picking ? [...chosen] : offered.map((i) => i.id))}>
                {busy === "accept" ? <Spinner size={14} /> : picking ? `Accept ${chosen.size} item${chosen.size === 1 ? "" : "s"}` : "Accept all"}
              </Button>
            )}
            {offered.length > 1 && !picking && (
              <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => setPicking(true)}>
                Choose items
              </Button>
            )}
            <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => respond([])}>
              {busy === "decline" ? <Spinner size={14} /> : "Decline"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-text-muted">Nothing is final until you drop the items off at the store.</p>
        </div>
      )}
      {request.status === "accepted" && <p className="mt-3 text-sm text-text-muted">Bring the accepted items to the store. You'll get paid when they check them in.</p>}
      {request.status === "submitted" && (
        <button type="button" onClick={cancel} disabled={!!busy} className="mt-3 text-xs text-text-muted underline hover:text-text">
          {busy === "cancel" ? "Cancelling..." : "Cancel this request"}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

export default function SellRequestsList({ requests, onChange }) {
  if (!requests.length) {
    return <p className="text-sm text-text-muted">Nothing sent yet. Batches you send to the store show up here with their offers.</p>;
  }
  return (
    <div className="space-y-3 max-w-2xl">
      {requests.map((r) => (
        <RequestCard key={`${r.id}-${r.status}`} request={r} onChange={onChange} />
      ))}
    </div>
  );
}
