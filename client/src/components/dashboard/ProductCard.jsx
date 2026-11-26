import { useState } from "react";
import { LuInfo, LuX, LuArrowRight } from "react-icons/lu";
import { useLayout } from "../ui/AnimatedToggleLayout.jsx";
import { itemConditionLabel } from "../../lib/alertOptions.js";
import TrackButton from "../store/TrackButton.jsx";
import CardPhotos from "./CardPhotos.jsx";
import { DealChip } from "./DealChip.jsx";


// Clicks on the card open the product; these stay inside the card
const keepInCard = (e) => e.stopPropagation();

// "Details" button — only when the product has a Shopify description
function DetailsButton({ open, onToggle, large }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        keepInCard(e);
        onToggle();
      }}
      aria-expanded={open}
      className={`inline-flex items-center gap-1 rounded-lg font-medium transition-colors ${
        large
          ? "text-base px-3 py-1.5 bg-neutral-100 text-neutral-600 hover:text-neutral-900"
          : "text-xs px-2.5 py-1 bg-text/5 text-text-muted hover:text-text"
      }`}
    >
      <LuInfo size={large ? 16 : 13} aria-hidden="true" />
      Details
    </button>
  );
}

// Slides up over the card with the product's description from Shopify.
// Always white text on a dark panel (in both themes): fixed colors also
// keep older iPhone/iPad Safari from drawing dark text on a dark panel.
// onOpen: "See condition" opens the full product (condition, notes, sizes)
function DetailsPanel({ item, open, onClose, onOpen }) {
  return (
    <div
      onClick={keepInCard}
      aria-hidden={!open}
      className={`absolute inset-0 z-10 flex flex-col bg-neutral-950/95 backdrop-blur-sm text-white transition-transform duration-300 ease-out ${
        open ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
    >
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2 border-b border-white/10">
        <p className="text-xs font-semibold leading-tight line-clamp-2">{item.product_name}</p>
        <button
          type="button"
          onClick={(e) => {
            keepInCard(e);
            onClose();
          }}
          tabIndex={open ? 0 : -1}
          aria-label="Close details"
          className="shrink-0 p-1 -m-1 text-white/60 hover:text-white"
        >
          <LuX size={16} />
        </button>
      </div>
      <p className="flex-1 overflow-y-auto px-3 py-2.5 text-sm leading-relaxed whitespace-pre-line">
        {item.description}
      </p>
      {onOpen && (
        <div className="flex justify-end border-t border-white/10 px-3 py-2">
          <button
            type="button"
            onClick={(e) => {
              keepInCard(e);
              onClose();
              onOpen();
            }}
            tabIndex={open ? 0 : -1}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 -mr-1 text-sm font-medium text-white hover:bg-white/10"
          >
            See condition <LuArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

// onOpen: opens the product (the dashboard's product view); the details
// panel's "See condition" uses it
// signedIn: adds the one-tap Track bell over the photo
export default function ProductCard({ item, onOpen, signedIn }) {
  const layout = useLayout();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasDetails = !!item.description;
  const toggleDetails = () => setDetailsOpen((open) => !open);

  if (layout === "list") {
    return (
      <div className="relative">
        <div className="relative w-full aspect-square bg-white overflow-hidden">
          <CardPhotos item={item} imgClassName="p-2" emptyClassName="bg-neutral-200" large />
          {itemConditionLabel(item) && (
            <span
              className={`absolute top-3 left-3 text-base font-medium px-2.5 py-1 rounded-full ${["brand_new", "sealed", "graded"].includes(item.condition) ? "bg-accent text-accent-text" : "bg-black/70 text-white"}`}
            >
              {itemConditionLabel(item)}
            </span>
          )}
          {item.size && (
            <span className="absolute top-3 right-3 text-base px-2.5 py-1 rounded-full font-medium bg-black/70 text-white">
            {item.size}
          </span>
          )}
          {signedIn && item.shopify_product_id && (
            <TrackButton item={item} signedIn className="absolute bottom-3 right-3" />
          )}
        </div>
        <div className="relative flex items-end justify-between gap-4 bg-white px-4 py-3">
          <div className="min-w-0">
            <DealChip item={item} large light />
            <p className="text-lg text-neutral-500 truncate">
              {item.product_name}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {hasDetails && <DetailsButton open={detailsOpen} onToggle={toggleDetails} large />}
            <span className="text-lg font-medium text-neutral-900">
              ${parseFloat(item.price).toFixed(0)}
            </span>
          </div>
        </div>
        {hasDetails && <DetailsPanel item={item} open={detailsOpen} onClose={() => setDetailsOpen(false)} onOpen={onOpen} />}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative w-full aspect-square bg-white rounded-t-xl overflow-hidden">
        <CardPhotos item={item} imgClassName="p-1" />
        {/* One row that wraps, so the condition and size never overlap on
            a narrow (two-across) phone card */}
        <div className="absolute top-2 inset-x-2 flex flex-wrap items-start justify-between gap-1 pointer-events-none">
          {itemConditionLabel(item) && (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${["brand_new", "sealed", "graded"].includes(item.condition) ? "bg-accent text-accent-text" : "bg-black/60 text-white"}`}
            >
              {itemConditionLabel(item)}
            </span>
          )}
          {item.size && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap bg-black/60 text-white">
              {item.size}
            </span>
          )}
        </div>
        {signedIn && item.shopify_product_id && (
          <TrackButton item={item} signedIn className="absolute bottom-2 right-2" />
        )}
      </div>
      <div className="relative p-3">
        <DealChip item={item} compact={layout === "4col"} />
        <p className="text-xs md:text-sm font-medium text-text leading-tight line-clamp-2 mb-2 min-h-[2.5em]">
          {item.product_name}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-semibold text-text">
            ${parseFloat(item.price).toFixed(0)}
          </span>
          {hasDetails ? (
            <DetailsButton open={detailsOpen} onToggle={toggleDetails} />
          ) : (
            <span className="text-xs font-medium bg-text/5 text-text-muted px-2.5 py-1 rounded-lg whitespace-nowrap">
              View →
            </span>
          )}
        </div>
      </div>
      {hasDetails && <DetailsPanel item={item} open={detailsOpen} onClose={() => setDetailsOpen(false)} onOpen={onOpen} />}
    </div>
  );
}
