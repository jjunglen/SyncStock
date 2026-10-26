const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");
const { textOnColor } = require("../utils/storeSettings.js");
const { sizeLine, priceLine, DEFAULT_STYLE, STORY_FONTS, DEFAULT_FONT } = require("../utils/storyDetails.js");

// Instagram story images (1080×1920) for new arrivals, emailed to the
// merchant (stories.service.js). The layout, top to bottom: the
// store's logo, or SyncStock's (top right, below Instagram's name bar), the
// product's first Shopify photo, "Size 10 - Brand New" and the price in
// boxes (black on white by default; colors are a store setting), then
// empty space for the link sticker the merchant adds in Instagram.
// Instagram covers roughly the top and bottom 250px with its own
// buttons, so nothing important sits there.
const WIDTH = 1080;
const HEIGHT = 1920;
const PHOTO = { top: 470, width: 960, height: 760 };
const LABEL_TOP = 1290;
// With the item name shown (a store setting), the photo is shorter so the
// name, size and price all fit above the link sticker's space
const PHOTO_WITH_NAME = { top: 470, width: 960, height: 500 };
const LABEL_TOP_WITH_NAME = 1000;

// Label fonts (STORY_FONTS), read from @fontsource once each
const fontFiles = {};
const fontFor = (key) => {
  const font = STORY_FONTS[key] || STORY_FONTS[DEFAULT_FONT];
  const file = path.join(
    __dirname,
    `../../node_modules/@fontsource/${font.package}/files/${font.package}-latin-${font.weight}-normal.woff`,
  );
  fontFiles[file] ||= fs.readFileSync(file);
  return { ...font, data: fontFiles[file] };
};

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
const productPhoto = async (url, area = PHOTO) => {
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
    .resize(area.width - 40, area.height - 40, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  return dataUri(fitted, "image/png");
};

const isWhite = (hex) => /^#f[a-f0-9]f[a-f0-9]f[a-f0-9]$/i.test(hex); // near-white

// The logo, top right: the store's own (Store settings → Branding) when
// it has one, otherwise the SyncStock mark — dark letters on a light
// background, white letters on a dark one. Both fit the same 140px-tall
// space; the store's logo has its empty border trimmed first.
const LOGO_FILES = {
  dark: path.join(__dirname, "../assets/syncstock-mark-dark.png"),
  light: path.join(__dirname, "../assets/syncstock-mark-light.png"),
};
const LOGO_HEIGHT = 140;
const LOGO_MAX_WIDTH = 380;
const logos = {};
const syncstockLogo = async (background) => {
  const variant = textOnColor(background) === "#ffffff" ? "light" : "dark";
  if (logos[variant]) return logos[variant];
  const png = await sharp(LOGO_FILES[variant]).resize({ height: LOGO_HEIGHT }).png().toBuffer();
  const { width, height } = await sharp(png).metadata();
  logos[variant] = { src: dataUri(png, "image/png"), width, height };
  return logos[variant];
};
const storeLogo = async ({ key, data }) => {
  if (logos[key]) return logos[key];
  let image = sharp(data);
  try {
    image = sharp(await image.trim().toBuffer());
  } catch {
    image = sharp(data); // nothing to trim
  }
  const png = await image.resize(LOGO_MAX_WIDTH, LOGO_HEIGHT, { fit: "inside" }).png().toBuffer();
  const { width, height } = await sharp(png).metadata();
  logos[key] = { src: dataUri(png, "image/png"), width, height };
  return logos[key];
};
const storyLogo = (background, logo) => (logo?.data ? storeLogo(logo) : syncstockLogo(background));

// Label box (size line, price); the font shrinks for long lines so the
// box always fits the story's width
const LABEL_TEXT_WIDTH = 900;
const perCharEm = (font) => font.widthEm + (font.letterSpacing || 0);
const labelFontSize = (shown, font) =>
  Math.min(
    Math.round(96 * (font.scale || 1)),
    Math.floor(LABEL_TEXT_WIDTH / (Math.max(shown.length, 1) * perCharEm(font))),
  );
const labelBox = (text, style, font) => {
  const shown = font.upper ? text.toUpperCase() : text;
  const fontSize = labelFontSize(shown, font);
  return el(
    "div",
    {
      display: "flex",
      backgroundColor: style.box,
      color: style.text,
      fontFamily: font.family,
      fontWeight: font.weight,
      fontSize,
      letterSpacing: font.letterSpacing ? `${font.letterSpacing}em` : undefined,
      ...(font.stroke && { WebkitTextStroke: `${font.stroke}px ${style.text}` }),
      lineHeight: 1.15,
      padding: "6px 30px 10px",
    },
    shown,
  );
};

// The item name: plain text (no box) in the same size as the "Size -
// Condition" box, black on a light background and white on a dark one,
// with a gap before the size line. It wraps onto up to three lines; a
// longer name is cut after the last whole word that fits (no "…").
const NAME_LINES = 3;
const NAME_FILL = 0.95; // letter widths are averages — leave some slack
const NAME_GAP = 80;
const nameText = (name, style, font, fontSize) => {
  let text = font.upper ? name.toUpperCase() : name;
  const max = Math.floor((NAME_LINES * LABEL_TEXT_WIDTH * NAME_FILL) / (fontSize * perCharEm(font)));
  if (text.length > max) text = text.slice(0, max + 1).replace(/\s+\S*$/, "");
  const color = textOnColor(style.background);
  return el(
    "div",
    {
      display: "flex",
      justifyContent: "center",
      textAlign: "center",
      maxWidth: LABEL_TEXT_WIDTH + 60,
      color,
      fontFamily: font.family,
      fontWeight: font.weight,
      fontSize,
      letterSpacing: font.letterSpacing ? `${font.letterSpacing}em` : undefined,
      ...(font.stroke && { WebkitTextStroke: `${font.stroke}px ${color}` }),
      lineHeight: 1.15,
      padding: "0 30px",
    },
    text,
  );
};

// One product (all its in-stock variants) → JPEG buffer.
// style: { background, box, text, font, showName } — see storyStyle — plus
// logo: { key, data } when the store has its own logo
const renderStory = async (variants, style = DEFAULT_STYLE) => {
  const first = variants[0];
  const font = fontFor(style.font);
  const area = style.showName ? PHOTO_WITH_NAME : PHOTO;
  const [photo, mark] = await Promise.all([productPhoto(first.image_url, area), storyLogo(style.background, style.logo)]);
  const name = style.showName ? first.product_name : null;
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
          top: area.top,
          left: (WIDTH - area.width) / 2,
          width: area.width,
          height: area.height,
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
          top: style.showName ? LABEL_TOP_WITH_NAME : LABEL_TOP,
          left: 0,
          width: WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        },
        [
          name &&
            nameText(
              name,
              style,
              font,
              labelFontSize(font.upper ? (size || price || name).toUpperCase() : size || price || name, font),
            ),
          // The gap between the name and the size line
          name && el("div", { display: "flex", height: NAME_GAP, width: 10 }, []),
          size && labelBox(size, style, font),
          price && labelBox(price, style, font),
        ].filter(Boolean),
      ),
    ],
  );

  const svg = await satori(tree, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: font.family, data: font.data, weight: font.weight, style: "normal" }],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
  return sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
};

module.exports = { renderStory };
