import { useState } from "react";
import { Link } from "react-router-dom";
import { LuBellPlus, LuBellRing } from "react-icons/lu";
import Spinner from "../ui/Spinner.jsx";
import { showToast } from "../../lib/toast.js";
import { hasSizeChoice, quickTrack, trackedMessage, trackSignupPath, useTracked } from "../../lib/quickTrack.js";
import TrackSizesModal from "./TrackSizesModal.jsx";

// The bell on a product card: opens the size picker (TrackSizesModal),
// or for an item with no sizes tracks it in one tap (lib/quickTrack.js).
// Green once any size is tracked; tapping it again adds more sizes.
// Signed out, it goes to sign-up and the dashboard opens the picker
// afterwards (?track=).
// Sits over the card's photo, so taps never open the product too.

const stop = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

export default function TrackButton({ item, signedIn, className = "" }) {
  const isTracked = useTracked(signedIn);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const tracked = isTracked(item);

  const base = `inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors ${className}`;
  const label = tracked ? `Tracking ${item.product_name}` : `Track ${item.product_name}`;

  if (signedIn === false) {
    return (
      <Link
        to={trackSignupPath(item)}
        onClick={(e) => e.stopPropagation()}
        rel="nofollow"
        aria-label={label}
        title="Track this"
        className={`${base} border-black/10 bg-white/90 text-neutral-800 hover:bg-white`}
      >
        <LuBellPlus size={16} aria-hidden="true" />
      </Link>
    );
  }

  const handleClick = async (e) => {
    stop(e);
    if (busy || !signedIn) return;
    if (hasSizeChoice(item)) {
      setPicking(true);
      return;
    }
    if (tracked) {
      showToast({ message: "You're already tracking this", link: { to: "/store/dashboard?tab=alerts", label: "Your alerts" } });
      return;
    }
    setBusy(true);
    try {
      const result = await quickTrack(item);
      showToast({ message: trackedMessage(result), link: { to: "/store/dashboard?tab=alerts", label: "Your alerts" } });
    } catch (err) {
      showToast({ tone: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={tracked}
      title={tracked ? "Tracking" : "Track this"}
      className={`${base} ${
        tracked ? "track-on" : "border-black/10 bg-white/90 text-neutral-800 hover:bg-white"
      }`}
    >
      {busy ? <Spinner size={14} /> : tracked ? <LuBellRing size={16} aria-hidden="true" /> : <LuBellPlus size={16} aria-hidden="true" />}
    </button>
    {picking && <TrackSizesModal item={item} onClose={() => setPicking(false)} />}
    </>
  );
}
