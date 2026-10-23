import { useEffect, useRef, useState } from "react";
import { LuSettings, LuEye, LuPalette, LuMail, LuUpload, LuCircleCheck, LuLayoutTemplate, LuExternalLink, LuSmartphone, LuInstagram } from "react-icons/lu";
import MerchantSidebar from "../../components/dashboard/MerchantSidebar.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Switch from "../../components/ui/Switch.jsx";
import api from "../../lib/api.js";
import { getMyStore } from "../../lib/myStore.js";
import { CATEGORY_META } from "../../lib/categories.js";
import { brandShades } from "../../lib/brandColors.js";

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
  // Instagram stories: a preview made from the newest in-stock product
  const [storyPreview, setStoryPreview] = useState(null);
  const [storyNote, setStoryNote] = useState("");
  // Story colors being edited (saved with "Save story colors")
  const [storyColors, setStoryColors] = useState(null);

  // Re-made after the colors are saved, so it always shows the real look
  const loadStoryPreview = () =>
    api
      .get("/store/stories/preview", { responseType: "blob" })
      .then((res) =>
        setStoryPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(res.data);
        }),
      )
      .catch(() => {});

  useEffect(() => {
    loadStoryPreview();
  }, []);

  // The story fonts, so each option in the Font picker shows itself
  useEffect(() => {
    if (document.getElementById("story-fonts")) return;
    const link = document.createElement("link");
    link.id = "story-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Oswald:wght@500&family=Bebas+Neue&family=Anton&family=Fredoka:wght@600&family=Poiret+One&family=Playfair+Display:wght@700&family=Courier+Prime:wght@700&family=Montserrat:wght@700&family=Inter:wght@700&display=swap";
    document.head.appendChild(link);
  }, []);

  const saveStoryFont = async (font) => {
    await run("story-font", () => api.put("/store/settings", { story_font: font }), "Font saved");
    loadStoryPreview();
  };

  const saveStoryColors = async () => {
    await run(
      "story-colors",
      () =>
        api.put("/store/settings", {
          story_background: storyColors.background,
          story_box_color: storyColors.box,
          story_text_color: storyColors.text,
        }),
      "Story colors saved",
    );
    loadStoryPreview();
  };

  const sendTestStories = async () => {
    setBusy("stories-test");
    setStoryNote("");
    try {
      const res = await api.post("/store/stories/test");
      setStoryNote(res.data.message);
    } catch (err) {
      setStoryNote(err.response?.data?.message || "Couldn't send the test email.");
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    Promise.all([api.get("/store/settings"), getMyStore().catch(() => null)])
      .then(([settingsRes, storeRes]) => {
        const data = settingsRes.data.data;
        setSettings(data);
        if (data.brand_color) setColor(data.brand_color);
        setStoryColors({
          background: data.story_background,
          box: data.story_box_color,
          text: data.story_text_color,
        });
        setStore(storeRes || null);
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
      <MerchantSidebar />

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
            {/* Shopify's App Store rules: show merchants how to add the
                theme app extension, with deep links into the theme editor
                (links built in storeSettings.controller.js) */}
            <Section
              icon={LuLayoutTemplate}
              title="Add SyncStock to your Shopify store"
              description="Send shoppers from your Shopify site to their restock alerts. Nothing to code — both are added in Shopify's theme editor."
            >
              <ol className="space-y-5">
                {[
                  {
                    key: "section",
                    title: "1. Add the \"Restock alerts\" section",
                    text: "A banner inviting shoppers to save their sizes. The button below opens your theme editor with the section ready to add — place it where you like, then click Save.",
                    manual: "Or: Online Store → Themes → Customize → Add section → Apps → Restock alerts.",
                    action: "Add section",
                  },
                  {
                    key: "button",
                    title: "2. Turn on the floating button (optional)",
                    text: "A small \"Restock alerts\" button in the corner of every page. The button below opens App embeds with it switched on — click Save to publish it.",
                    manual: "Or: Online Store → Themes → Customize → App embeds → Restock alerts button.",
                    action: "Turn on button",
                  },
                ].map((step) => (
                  <li key={step.key}>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-text-muted mt-1">{step.text}</p>
                    <p className="text-xs text-text-muted mt-1">{step.manual}</p>
                    {settings.theme_links?.[step.key] && (
                      <Button
                        variant={step.key === "section" ? "primary" : "secondary"}
                        size="sm"
                        className="mt-3"
                        onClick={() => window.open(settings.theme_links[step.key], "_blank", "noopener,noreferrer")}
                      >
                        <span className="flex items-center gap-1.5">
                          {step.action} <LuExternalLink size={13} />
                        </span>
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </Section>

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

              {validColor && (() => {
                const shades = brandShades(color);
                const changed = [
                  shades.dark.color !== color.toLowerCase() && "dark",
                  shades.light.color !== color.toLowerCase() && "light",
                ].filter(Boolean);
                return changed.length > 0 ? (
                  <p className="text-xs text-text-muted mt-3">
                    This color is adjusted slightly in {changed.join(" and ")} mode so buttons stay easy to see.
                  </p>
                ) : null;
              })()}
              <p className="text-xs text-text-muted mt-5 mb-2">
                How it looks on your store{(settings.brand_color || "#378add") === color.toLowerCase() ? "" : " (not saved yet)"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "Light", bg: "#ffffff", surface: "#f4f4f5", text: "#0a0a0a", muted: "#52525b", border: "#e4e4e7" },
                  { name: "Dark", bg: "#0a0a0a", surface: "#161616", text: "#fafafa", muted: "#a1a1a1", border: "#262626" },
                ].map((theme) => {
                  // The same per-theme shade shoppers see (lib/brandColors.js)
                  const shades = brandShades(validColor ? color : "#378add");
                  const shade = theme.name === "Dark" ? shades.dark : shades.light;
                  const accent = shade.color;
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
                          style={{ background: accent, color: shade.text }}
                        >
                          Brand New
                        </span>
                        <p className="text-xs font-medium mb-2">Air Jordan 4 Retro</p>
                        <span
                          className="block text-center text-xs font-medium rounded-md py-1.5"
                          style={{ background: accent, color: shade.text }}
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

            <Section
              icon={LuInstagram}
              title="Instagram stories"
              description="When new items are added to Shopify, get an email with a ready-to-post Instagram story for each one (1080×1920), zipped, with each item's link for the link sticker."
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Email me new-arrival stories</span>
                <Switch
                  label="Email me new-arrival stories"
                  checked={settings.instagram_stories}
                  disabled={busy === "stories"}
                  onChange={(value) =>
                    run("stories", () => api.put("/store/settings", { instagram_stories: value }), value ? "Stories email on" : "Stories email off")
                  }
                />
              </div>

              <p className="text-xs text-text-muted mt-5 mb-2">When to send</p>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="When to send stories">
                {[
                  { value: "daily", title: "Every morning", detail: "9 AM Central, with everything new since the last email" },
                  { value: "batch", title: "After each batch", detail: "15 minutes after new items stop coming in, once there are 2 or more" },
                ].map((option) => {
                  const selected = settings.story_frequency === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={busy === "story-frequency"}
                      onClick={() =>
                        !selected &&
                        run("story-frequency", () => api.put("/store/settings", { story_frequency: option.value }), "Saved")
                      }
                      className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${selected ? "border-text bg-text/5" : "border-border hover:border-text/20"}`}
                    >
                      <span className="block text-sm font-medium">{option.title}</span>
                      <span className="block text-xs text-text-muted">{option.detail}</span>
                    </button>
                  );
                })}
              </div>

              {storyColors && (
                <>
                  <p className="text-xs text-text-muted mt-5 mb-2">Colors</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: "Classic white", background: "#ffffff", box: "#0b0b0b", text: "#ffffff" },
                      { label: "Black", background: "#0b0b0b", box: "#ffffff", text: "#0b0b0b" },
                      ...(settings.brand_color
                        ? [{ label: "Brand color", background: settings.brand_color, box: "#ffffff", text: "#0b0b0b" }]
                        : []),
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setStoryColors({ background: preset.background, box: preset.box, text: preset.text })}
                        className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:border-text/20"
                      >
                        <span
                          className="inline-flex h-4 w-4 items-center justify-center rounded border border-border"
                          style={{ background: preset.background }}
                          aria-hidden="true"
                        >
                          <span className="h-1.5 w-2.5" style={{ background: preset.box }} />
                        </span>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { key: "background", label: "Background" },
                      { key: "box", label: "Label boxes" },
                      { key: "text", label: "Label text" },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="color"
                          value={storyColors[key]}
                          onChange={(e) => setStoryColors((c) => ({ ...c, [key]: e.target.value }))}
                          aria-label={`Story ${label.toLowerCase()} color`}
                          className="h-9 w-10 cursor-pointer rounded-lg border border-border bg-surface p-1"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={
                        busy === "story-colors" ||
                        (storyColors.background === settings.story_background &&
                          storyColors.box === settings.story_box_color &&
                          storyColors.text === settings.story_text_color)
                      }
                      onClick={saveStoryColors}
                    >
                      Save story colors
                    </Button>
                  </div>
                </>
              )}

              {settings.story_fonts && (
                <>
                  <p className="text-xs text-text-muted mt-5 mb-2">Font</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Story font">
                    {settings.story_fonts.map((font) => {
                      const selected = settings.story_font === font.key;
                      return (
                        <button
                          key={font.key}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={busy === "story-font"}
                          onClick={() => !selected && saveStoryFont(font.key)}
                          className={`rounded-lg border px-3 py-2 text-left transition-colors ${selected ? "border-text bg-text/5" : "border-border hover:border-text/20"}`}
                        >
                          <span
                            className="block text-lg leading-tight truncate"
                            style={{
                              fontFamily: `"${font.family}", sans-serif`,
                              fontWeight: font.weight,
                              textTransform: font.upper ? "uppercase" : "none",
                            }}
                          >
                            Size 10 - $165
                          </span>
                          <span className="block text-xs text-text-muted">{font.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mt-5 flex flex-col sm:flex-row gap-4 sm:items-end">
                {storyPreview && (
                  <img
                    src={storyPreview}
                    alt="Example Instagram story made from your newest product"
                    className="w-32 aspect-[9/16] rounded-lg border border-border object-cover"
                  />
                )}
                <div className="flex flex-col gap-2 items-start">
                  <Button variant="secondary" size="sm" disabled={busy === "stories-test"} onClick={sendTestStories}>
                    {busy === "stories-test" ? "Sending..." : "Send me a test email"}
                  </Button>
                  <p className="text-xs text-text-muted">
                    {storyNote || "Uses the last 24 hours of new arrivals (up to 10)."}
                  </p>
                </div>
              </div>
            </Section>

            {/* The phone app's store list — switched off until the app
                launches */}
            <Section
              icon={LuSmartphone}
              title="SyncStock app"
              description="Let shoppers find your store in the SyncStock app for iPhone and Android, with alerts sent straight to their phone."
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">List my store in the SyncStock app</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-text/5 text-text-muted">
                    Coming soon
                  </span>
                </div>
                <Switch
                  label="List my store in the SyncStock app"
                  checked={false}
                  disabled
                  onChange={() => {}}
                />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
