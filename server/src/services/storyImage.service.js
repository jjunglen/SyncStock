const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");
const { textOnColor } = require("../utils/storeSettings.js");
const { sizeLine, priceLine, DEFAULT_STYLE } = require("../utils/storyDetails.js");

// Instagram story images (1080×1920) for new arrivals, emailed to the
// merchant (stories.service.js). The layout, top to bottom: the
// SyncStock logo (top right, below Instagram's own name bar), the
// product's first Shopify photo, "Size 10 - Brand New" and the price in
// boxes (black on white by default; colors are a store setting), then
// empty space for the link sticker the merchant adds in Instagram.
// Instagram covers roughly the top and bottom 250px with its own
// buttons, so nothing important sits there.
const WIDTH = 1080;
const HEIGHT = 1920;
const PHOTO = { top: 470, width: 960, height: 760 };
const LABEL_TOP = 1290;

const FONT_FILE = path.join(
  __dirname,
  "../../node_modules/@fontsource/oswald/files/oswald-latin-500-normal.woff",
);
let font = null;
const loadFont = () => (font ||= fs.readFileSync(FONT_FILE));

// satori is an ES module
let satoriFn = null;
const satori = async (...args) => {
  satoriFn ||= (await import("satori")).default;
  return satoriFn(...args);
};

// Element helper — satori takes React-style objects
const el = (type, style, children) => ({ type, props: { style, children } });

// The photo at Shopify's CDN, asked for at a sensible size
const photoUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("shopify.com")) u.searchParams.set("width", "1200");
    return u.toString();
  } catch {
    return url;
  }
};

const dataUri = (buffer, mime) => `data:${mime};base64,${buffer.toString("base64")}`;

// The product photo, trimmed of its empty margins and fitted to the
// photo area on white, so every shoe fills the story the same way
const productPhoto = async (url) => {
  const resp = await fetch(photoUrl(url));
  if (!resp.ok) throw new Error(`Photo download failed (${resp.status})`);
  const original = Buffer.from(await resp.arrayBuffer());
  let image = sharp(original).flatten({ background: "#ffffff" });
  try {
    image = sharp(await image.trim({ threshold: 12 }).toBuffer());
  } catch {
    image = sharp(original).flatten({ background: "#ffffff" }); // nothing to trim
  }
  const fitted = await image
    .resize(PHOTO.width - 40, PHOTO.height - 40, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  return dataUri(fitted, "image/png");
};

const isWhite = (hex) => /^#f[a-f0-9]f[a-f0-9]f[a-f0-9]$/i.test(hex); // near-white

// The SyncStock mark on every story: dark letters on a light
// background, white letters on a dark one
const LOGO_FILES = {
  dark: path.join(__dirname, "../assets/syncstock-mark-dark.png"),
  light: path.join(__dirname, "../assets/syncstock-mark-light.png"),
};
const LOGO_HEIGHT = 140;
const logos = {};
const syncstockLogo = async (background) => {
  const variant = textOnColor(background) === "#ffffff" ? "light" : "dark";
  if (logos[variant]) return logos[variant];
  const png = await sharp(LOGO_FILES[variant]).resize({ height: LOGO_HEIGHT }).png().toBuffer();
  const { width, height } = await sharp(png).metadata();
  logos[variant] = { src: dataUri(png, "image/png"), width, height };
  return logos[variant];
};

// Label box (size line, price); the font shrinks for long lines so the
// box always fits the story's width
const labelBox = (text, style) => {
  const fontSize = Math.min(96, Math.floor(2000 / Math.max(text.length, 1)));
  return el(
    "div",
    {
      display: "flex",
      backgroundColor: style.box,
      color: style.text,
      fontFamily: "Oswald",
      fontSize,
      lineHeight: 1.15,
      padding: "6px 30px 10px",
    },
    text,
  );
};

// One product (all its in-stock variants) → JPEG buffer.
// style: { background, box, text } — see storyStyle
const renderStory = async (variants, style = DEFAULT_STYLE) => {
  const first = variants[0];
  const [photo, mark] = await Promise.all([productPhoto(first.image_url), syncstockLogo(style.background)]);
  const size = sizeLine(variants);
  const price = priceLine(variants);
  // Most product photos have a white background, which would show as a
  // hard-edged square on any other color — so they sit on a white card
  const card = !isWhite(style.background);

  const tree = el(
    "div",
    { display: "flex", width: WIDTH, height: HEIGHT, backgroundColor: style.background, position: "relative" },
    [
      el(
        "div",
        { position: "absolute", top: 270, right: 60, display: "flex" },
        { type: "img", props: { src: mark.src, width: mark.width, height: mark.height } },
      ),
      el(
        "div",
        {
          position: "absolute",
          top: PHOTO.top,
          left: (WIDTH - PHOTO.width) / 2,
          width: PHOTO.width,
          height: PHOTO.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...(card && { backgroundColor: "#ffffff", borderRadius: 36 }),
        },
        { type: "img", props: { src: photo, style: { maxWidth: "100%", maxHeight: "100%" } } },
      ),
      el(
        "div",
        {
          position: "absolute",
          top: LABEL_TOP,
          left: 0,
          width: WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        },
        [size && labelBox(size, style), price && labelBox(price, style)].filter(Boolean),
      ),
    ],
  );

  const svg = await satori(tree, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: "Oswald", data: loadFont(), weight: 500, style: "normal" }],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
  return sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
};

module.exports = { renderStory };
