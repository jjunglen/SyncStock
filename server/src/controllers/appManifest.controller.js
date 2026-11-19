const { Store } = require("../models/index.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");

// "Add to Home Screen" for a store's shopper site: the app gets the
// store's own name and logo ("The Laboratory DTX"), not Syncstock's.
// The site points its <link rel="manifest"> here (client lib/appManifest.js).

const SUBDOMAIN_RE = /^[a-z0-9-]{1,63}$/;
const ICON_SIZES = [192, 512];
const DARK = "#0a0a0a";

// Home Screen labels cut off around 12 characters: whole words that fit,
// without a leading "The" ("The Laboratory DTX" → "Laboratory")
const shortName = (name) => {
  if (name.length <= 12) return name;
  let out = "";
  for (const word of name.replace(/^the\s+/i, "").split(/\s+/)) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > 12) break;
    out = next;
  }
  return out || name.slice(0, 12);
};

// GET /api/store/manifest?s=<subdomain>
const storeManifest = async (req, res) => {
  try {
    const subdomain = String(req.query.s || "").toLowerCase();
    if (!SUBDOMAIN_RE.test(subdomain)) return res.status(404).end();
    const store = await Store.findOne({
      where: { subdomain, status: "active" },
      attributes: ["id", "name", "subdomain", "logo_updated_at"],
    });
    if (!store) return res.status(404).end();

    const site = storeBaseUrl(store);
    const version = store.logo_updated_at ? new Date(store.logo_updated_at).getTime() : 0;
    const icons = store.logo_updated_at
      ? ICON_SIZES.flatMap((size) => {
          const src = `${process.env.BACKEND_URL}/api/store/app-icon/${store.id}/${size}.png?v=${version}`;
          return [
            { src, sizes: `${size}x${size}`, type: "image/png", purpose: "any" },
            { src, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" },
          ];
        })
      : [
          { src: `${site}/icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${site}/icon-512.png`, sizes: "512x512", type: "image/png" },
          { src: `${site}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ];

    const name = store.name || "Restock alerts";
    res.set({
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    return res.send(
      JSON.stringify({
        id: `${site}/`,
        name,
        short_name: shortName(name),
        description: `Restock alerts in your size at ${name}.`,
        start_url: `${site}/store/dashboard?src=home_screen`,
        scope: `${site}/`,
        display: "standalone",
        background_color: DARK,
        theme_color: DARK,
        icons,
      }),
    );
  } catch (error) {
    console.error("Store manifest error:", error.message);
    return res.status(500).end();
  }
};

// The logo, centered on a square tile (white, or near-black for a light
// logo so it stays visible), with room around it for phones that round
// or circle-crop the icon. Kept in memory per logo version.
const icons = new Map();
const MAX_ICONS = 60;

const lightLogo = async (sharp, data) => {
  const { data: px, info } = await sharp(data).ensureAlpha().resize(64, 64, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let weight = 0;
  for (let i = 0; i < px.length; i += info.channels) {
    const alpha = px[i + 3] / 255;
    sum += alpha * (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    weight += alpha;
  }
  return weight > 0 && sum / weight > 200;
};

// GET /api/store/app-icon/:id/:size.png
const storeAppIcon = async (req, res) => {
  try {
    const size = Number(req.params.size);
    if (!ICON_SIZES.includes(size)) return res.status(404).end();
    const store = await Store.unscoped().findByPk(req.params.id, {
      attributes: ["id", "logo_data", "logo_updated_at"],
    });
    if (!store?.logo_data) return res.status(404).end();

    const key = `${store.id}:${size}:${new Date(store.logo_updated_at || 0).getTime()}`;
    let png = icons.get(key);
    if (!png) {
      const sharp = require("sharp"); // loaded on first use, not at startup
      const background = (await lightLogo(sharp, store.logo_data)) ? DARK : "#ffffff";
      // The middle 60%: inside the safe zone of maskable icons
      const inner = Math.round(size * 0.6);
      const logo = await sharp(store.logo_data)
        .trim()
        .resize(inner, inner, { fit: "inside" })
        .png()
        .toBuffer();
      png = await sharp({ create: { width: size, height: size, channels: 4, background } })
        .composite([{ input: logo, gravity: "center" }])
        .png()
        .toBuffer();
      if (icons.size >= MAX_ICONS) icons.delete(icons.keys().next().value);
      icons.set(key, png);
    }
    res.set({
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=604800, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(png);
  } catch (error) {
    // A malformed id or unreadable logo: "not found"
    return res.status(404).end();
  }
};

module.exports = { storeManifest, storeAppIcon };
