// After `vite build`: writes each public www page as real HTML
// (dist/www/*.html) — its heading, text and links already in the page,
// plus its own title, description and canonical address — for crawlers
// that don't run JavaScript (Semrush, Bing's first pass, link previews).
// vercel.json serves these on www.syncstock.io only; store sites keep
// index.html. In the browser the app starts as usual and draws over it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ssrOut = path.join(root, "dist-ssr");
const SITE = "https://www.syncstock.io";

// Page → file in dist/www (vercel.json maps the addresses to these)
const PAGES = {
  "/": "home.html",
  "/pricing": "pricing.html",
  "/stores": "stores.html",
  "/for/sneaker-stores": "for-sneaker-stores.html",
  "/for/streetwear-stores": "for-streetwear-stores.html",
  "/for/trading-card-shops": "for-trading-card-shops.html",
  "/privacy": "privacy.html",
  "/terms": "terms.html",
  "/cookies": "cookies.html",
};

// Who SyncStock is, on the home page only (store sites aren't SyncStock's)
const HOME_SCHEMA = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SyncStock",
    url: `${SITE}/`,
    logo: `${SITE}/icon-512.png`,
    description: "Restock alerts for sneaker, streetwear and trading card stores on Shopify.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SyncStock",
    url: `${SITE}/`,
  },
];

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const replaceOnce = (html, find, replacement) => {
  if (!find.test(html)) throw new Error(`prerender: ${find} not found in index.html`);
  return html.replace(find, replacement);
};

await build({
  root,
  configFile: false,
  publicDir: false,
  logLevel: "warn",
  plugins: [react()],
  build: { ssr: "src/prerender.jsx", outDir: ssrOut, emptyOutDir: true },
});
const { render, MARKETING } = await import(pathToFileURL(path.join(ssrOut, "prerender.js")).href);

const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");
fs.mkdirSync(path.join(dist, "www"), { recursive: true });

for (const [page, file] of Object.entries(PAGES)) {
  const meta = MARKETING[page];
  if (!meta) throw new Error(`prerender: no title for ${page} (components/Seo.jsx)`);
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = `${SITE}${page === "/" ? "/" : page}`;
  const schema =
    page === "/"
      ? HOME_SCHEMA.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("")
      : "";

  let html = template;
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = replaceOnce(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`);
  html = replaceOnce(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`);
  html = replaceOnce(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`);
  html = replaceOnce(
    html,
    /<\/head>/,
    `<link rel="canonical" href="${canonical}" /><meta property="og:url" content="${canonical}" />${schema}</head>`,
  );
  html = replaceOnce(html, /<div id="root"><\/div>/, `<div id="root">${render(page)}</div>`);
  fs.writeFileSync(path.join(dist, "www", file), html);
}

// The app's page is served as app.html (vercel.json): Vercel serves a
// matching file before any rewrite, so a dist/index.html would answer "/"
// on every host and www's home would never get its pre-built page
fs.renameSync(path.join(dist, "index.html"), path.join(dist, "app.html"));

fs.rmSync(ssrOut, { recursive: true, force: true });
console.log(`prerender: ${Object.keys(PAGES).length} www pages`);
