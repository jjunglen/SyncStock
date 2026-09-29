import { useEffect, useRef, useState } from "react";
import { LuSettings, LuEye, LuPalette, LuMail, LuUpload, LuCircleCheck } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Switch from "../../components/ui/Switch.jsx";
import api from "../../lib/api.js";
import { CATEGORY_META } from "../../lib/categories.js";

const MAX_LOGO_BYTES = 300 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className="text-text-muted" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-text-muted mb-5">{description}</p>
      {children}
    </section>
  );
}

// /settings — what shoppers see, branding, and the weekly email.
// Switches save straight away; the brand color saves with its button.
export default function StoreSettings() {
  const [store, setStore] = useState(null);
  const [settings, setSettings] = useState(null);
  const [color, setColor] = useState("#378add");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const fileInput = useRef(null);

  useEffect(() => {
    Promise.all([api.get("/store/settings"), api.get("/store").catch(() => null)])
      .then(([settingsRes, storeRes]) => {
        const data = settingsRes.data.data;
        setSettings(data);
        if (data.brand_color) setColor(data.brand_color);
        setStore(storeRes?.data.data || null);
      })
      .catch(() => setError("Failed to load store settings"))
      .finally(() => setLoading(false));
  }, []);

  const flashSaved = (what) => {
    setSaved(what);
    setTimeout(() => setSaved(""), 2000);
  };

  const run = async (key, request, message) => {
    setBusy(key);
    setError("");
    try {
      const res = await request();
      setSettings(res.data.data);
      flashSaved(message);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save. Try again.");
    } finally {
      setBusy("");
    }
  };

  const toggleCategory = (key, on) => {
    const next = on
      ? [...settings.enabled_categories, key]
      : settings.enabled_categories.filter((c) => c !== key);
    run(`cat-${key}`, () => api.put("/store/settings", { enabled_categories: next }), "Categories saved");
  };

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setError("Logo must be a PNG, JPG or WebP");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be under 300 KB");
      return;
    }
    run(
      "logo",
      () => api.put("/store/logo", file, { headers: { "Content-Type": file.type } }),
      "Logo updated",
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full bg-bg text-text">
        <MerchantSidebar />
        <div className="flex-1 p-6"><Spinner size={20} /></div>
      </div>
    );
  }

  const categories = settings
    ? [...settings.selectable_categories, ...settings.coming_soon_categories]
    : [];
  const validColor = /^#[0-9a-f]{6}$/i.test(color);

  return (
    <div className="flex min-h-screen w-full bg-bg text-text">
      <MerchantSidebar storeName={store?.name} storeSubdomain={store?.subdomain} />

      <div className="flex-1 p-6 overflow-auto max-w-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LuSettings size={18} className="text-text" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Store settings</h1>
          {saved && (
            <span className="ml-auto text-xs text-live flex items-center gap-1">
              <LuCircleCheck size={13} /> {saved}
            </span>
          )}
        </div>

        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        {settings && (
          <>
            <Section
              icon={LuEye}
              title="What shoppers see"
              description="Hidden categories disappear from your store site and don't send alerts. Keep at least one on."
            >
              <div className="divide-y divide-border">
                {categories.map((key) => {
                  const comingSoon = settings.coming_soon_categories.includes(key);
                  const on = settings.enabled_categories.includes(key);
                  const lastOne = on && settings.enabled_categories.length === 1;
                  return (
                    <div key={key} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${comingSoon ? "text-text-muted" : ""}`}>
                          {CATEGORY_META[key]?.label || key}
                        </span>
                        {comingSoon && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-text/5 text-text-muted">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <Switch
                        label={CATEGORY_META[key]?.label || key}
                        checked={on && !comingSoon}
                        disabled={comingSoon || lastOne || busy === `cat-${key}`}
                        onChange={(value) => toggleCategory(key, value)}
                      />
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section
              icon={LuPalette}
              title="Branding"
              description="Your logo and color on your store site and in alert emails."
            >
              <p className="text-xs text-text-muted mb-2">Logo</p>
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="flex h-14 min-w-28 items-center justify-center rounded-lg border border-border bg-white px-3">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Store logo" className="h-9 w-auto max-w-40 object-contain" />
                  ) : (
                    <span className="text-xs text-neutral-400">No logo</span>
                  )}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept={LOGO_TYPES.join(",")}
                  onChange={handleLogo}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy === "logo"}
                  onClick={() => fileInput.current?.click()}
                >
                  {busy === "logo" ? <Spinner size={14} /> : (
                    <span className="flex items-center gap-1.5"><LuUpload size={14} /> {settings.logo_url ? "Replace" : "Upload"}</span>
                  )}
                </Button>
                {settings.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === "logo-remove"}
                    onClick={() => run("logo-remove", () => api.delete("/store/logo"), "Logo removed")}
                  >
                    Remove
                  </Button>
                )}
                <p className="w-full text-xs text-text-muted">PNG, JPG or WebP, under 300 KB. A wide logo on a transparent background works best.</p>
              </div>

              <p className="text-xs text-text-muted mb-2">Brand color</p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="color"
                  value={validColor ? color : "#378add"}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Pick brand color"
                  className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-surface p-1"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value.trim())}
                  aria-label="Brand color hex code"
                  className="w-28 bg-surface-muted border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none"
                />
              </div>

              <p className="text-xs text-text-muted mt-5 mb-2">
                How it looks on your store{(settings.brand_color || "#378add") === color.toLowerCase() ? "" : " (not saved yet)"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "Light", bg: "#ffffff", surface: "#f4f4f5", text: "#0a0a0a", muted: "#52525b", border: "#e4e4e7" },
                  { name: "Dark", bg: "#0a0a0a", surface: "#161616", text: "#fafafa", muted: "#a1a1a1", border: "#262626" },
                ].map((theme) => {
                  const accent = validColor ? color : "#378add";
                  return (
                    <div
                      key={theme.name}
                      aria-hidden="true"
                      className="rounded-lg border p-3 select-none pointer-events-none"
                      style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        {settings.logo_url ? (
                          <span className="flex h-7 items-center rounded bg-white px-1.5">
                            <img src={settings.logo_url} alt="" className="h-4 w-auto max-w-20 object-contain" />
                          </span>
                        ) : (
                          <span className="text-xs font-semibold">{store?.name || "Your store"}</span>
                        )}
                        <span className="text-[10px]" style={{ color: theme.muted }}>{theme.name}</span>
                      </div>
                      <div className="rounded-md p-2.5" style={{ background: theme.surface }}>
                        <span
                          className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-2"
                          style={{ background: accent, color: textOn(accent) }}
                        >
                          Brand New
                        </span>
                        <p className="text-xs font-medium mb-2">Air Jordan 4 Retro</p>
                        <span
                          className="block text-center text-xs font-medium rounded-md py-1.5"
                          style={{ background: accent, color: textOn(accent) }}
                        >
                          Buy now
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!validColor || busy === "color" || color.toLowerCase() === settings.brand_color}
                  onClick={() => run("color", () => api.put("/store/settings", { brand_color: color }), "Color saved")}
                >
                  Save color
                </Button>
                {settings.brand_color && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === "color"}
                    onClick={() => {
                      setColor("#378add");
                      run("color", () => api.put("/store/settings", { brand_color: null }), "Color reset");
                    }}
                  >
                    Use default
                  </Button>
                )}
              </div>
            </Section>

            <Section
              icon={LuMail}
              title="Weekly most-wanted email"
              description="Every Monday morning: the sizes the most shoppers are waiting on that you don't have in stock."
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Send it to me</span>
                <Switch
                  label="Weekly most-wanted email"
                  checked={settings.weekly_report}
                  disabled={busy === "weekly"}
                  onChange={(value) =>
                    run("weekly", () => api.put("/store/settings", { weekly_report: value }), value ? "Weekly email on" : "Weekly email off")
                  }
                />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

// Black or white text on the preview, whichever reads better
function textOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.4 ? "#0a0a0a" : "#ffffff";
}
