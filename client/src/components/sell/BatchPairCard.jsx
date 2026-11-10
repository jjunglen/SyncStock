import { useRef, useState } from "react";
import { LuCamera, LuTrash2, LuX, LuFootprints, LuCircleCheck, LuCircle } from "react-icons/lu";
import Spinner from "../ui/Spinner.jsx";
import AuthPhoto from "./AuthPhoto.jsx";
import api from "../../lib/api.js";
import { resizePhoto } from "../../lib/photoResize.js";
import { boxLabel, photoShots } from "../../lib/sellLabels.js";

// One pair in the shopper's batch: details, the photo checklist and the
// photo tiles. Tapping a tile opens the phone's camera (or photo library);
// several photos can be picked at once. Each is shrunk before uploading.
//   pair — from the API; onChange() reloads the batch

const MAX_PHOTOS = 6;
const CONDITION = { new: "Brand new", used: "Pre-owned" };

export default function BatchPairCard({ pair, onChange }) {
  const input = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const have = pair.photos.length;
  const need = pair.min_photos;
  const done = have >= need;
  // Shoes: sides, soles, box label; clothing: front, back, tag (sellLabels.js)
  const shots = photoShots(pair.condition, pair.category);

  const addPhotos = async (e) => {
    const files = [...(e.target.files || [])].slice(0, MAX_PHOTOS - have);
    e.target.value = "";
    if (!files.length) return;
    setError("");
    for (const file of files) {
      setUploading((n) => n + 1);
      try {
        const blob = await resizePhoto(file);
        await api.post(`/sell/items/${pair.id}/photos`, blob, { headers: { "Content-Type": "image/jpeg" } });
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Couldn't upload that photo. Try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    onChange();
  };

  const run = async (key, request) => {
    setBusy(key);
    setError("");
    try {
      await request();
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setBusy("");
    }
  };

  const tiles = Math.min(MAX_PHOTOS, Math.max(need, have + (have < MAX_PHOTOS ? 1 : 0)));

  return (
    <div className={`rounded-2xl border bg-surface p-4 ${done ? "border-border" : "border-warn/50"}`}>
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
          {pair.image_url ? <img src={pair.image_url} alt="" className="h-full w-full object-contain" /> : <LuFootprints className="text-neutral-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{pair.product_name}</p>
          <p className="text-xs text-text-muted">
            {[pair.style_code, `Size ${pair.size}`, boxLabel(pair.box, pair.category), pair.asking_price ? `Asking $${pair.asking_price}` : null].filter(Boolean).join(" · ")}
          </p>
          {pair.notes && <p className="text-xs text-text-muted mt-0.5">“{pair.notes}”</p>}
        </div>
        <button
          type="button"
          aria-label={`Remove ${pair.product_name} size ${pair.size}`}
          disabled={!!busy}
          onClick={() => run("remove", () => api.delete(`/sell/items/${pair.id}`))}
          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-text/5"
        >
          {busy === "remove" ? <Spinner size={14} /> : <LuTrash2 size={16} />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Condition" className="inline-grid grid-cols-2 gap-1 p-1 border border-text/15 rounded-xl bg-surface-muted">
          {Object.entries(CONDITION).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={pair.condition === key}
              disabled={!!busy}
              onClick={() => pair.condition !== key && run("condition", () => api.put(`/sell/items/${pair.id}`, { condition: key }))}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${pair.condition === key ? "bg-primary text-primary-text font-semibold" : "text-text hover:bg-text/10"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${done ? "bg-live/10 text-live" : "bg-warn/10 text-warn"}`}>
          {done ? `${have} photos — done` : `${have} of ${need} photos`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Array.from({ length: tiles }, (_, i) => {
          const photo = pair.photos[i];
          if (photo) {
            return (
              <div key={photo.id} className="relative aspect-square">
                <AuthPhoto url={photo.url} alt={`${shots[i] || "Photo"} of ${pair.product_name}`} className="h-full w-full rounded-xl" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  disabled={!!busy}
                  onClick={() => run(`photo-${photo.id}`, () => api.delete(`/sell/photos/${photo.id}`))}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-bg border border-border p-1 text-text-muted hover:text-danger"
                >
                  {busy === `photo-${photo.id}` ? <Spinner size={10} /> : <LuX size={12} />}
                </button>
              </div>
            );
          }
          const required = i < need;
          return (
            <button
              key={`add-${i}`}
              type="button"
              onClick={() => input.current?.click()}
              disabled={uploading > 0}
              className="aspect-square rounded-xl border border-dashed border-text/25 flex flex-col items-center justify-center gap-1 px-1 text-center text-[11px] leading-tight text-text-muted hover:border-text/50 hover:text-text"
            >
              {uploading > 0 && i === have ? <Spinner size={16} /> : <LuCamera size={18} aria-hidden="true" />}
              <span>
                {shots[i] || "Extra"}
                {required && " *"}
              </span>
            </button>
          );
        })}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-muted">
        {shots.slice(0, need).map((shot, i) => (
          <li key={shot} className="flex items-center gap-1">
            {i < have ? <LuCircleCheck size={12} className="text-live" aria-hidden="true" /> : <LuCircle size={12} aria-hidden="true" />}
            {shot}
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
