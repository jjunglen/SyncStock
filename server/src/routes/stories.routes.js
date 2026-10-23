const express = require("express");
const router = express.Router();
const { Store } = require("../models/index.js");
const { verifyStoriesToken } = require("../utils/jwt.js");
const { publicLimiter } = require("../middleware/rateLimit.middleware.js");
const { escapeHtml } = require("../services/emailLayout.js");
const {
  findNewArrivals,
  renderAll,
  storyImage,
  buildZip,
  fileName,
} = require("../services/stories.service.js");

// The links in the daily Instagram stories email (stories.service.js).
// The token names the store and the time window; the stories are
// re-made from the current catalog, so sold-out items drop off.
router.use(publicLimiter);

const load = async (req, res) => {
  const link = verifyStoriesToken(req.params.token);
  const store = link ? await Store.findByPk(link.store_id) : null;
  if (!store) {
    res.status(404).type("text").send("This link has expired. Stories links last 7 days.");
    return null;
  }
  const items = await findNewArrivals(store, new Date(link.from), new Date(link.to));
  return { store, items };
};

// GET /api/stories/:token/zip
router.get("/:token/zip", async (req, res) => {
  try {
    const found = await load(req, res);
    if (!found) return;
    const images = await renderAll(found.store, found.items);
    const zip = await buildZip(found.items, images);
    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", 'attachment; filename="new-arrival-stories.zip"');
    return res.send(zip);
  } catch (error) {
    console.error("Stories zip error:", error.message);
    return res.status(500).type("text").send("Couldn't make the zip. Try again in a minute.");
  }
});

// GET /api/stories/:token/:n.jpg — one story, by its number in the list
router.get("/:token/:n.jpg", async (req, res) => {
  try {
    const found = await load(req, res);
    if (!found) return;
    const item = found.items[Number(req.params.n) - 1];
    if (!item) return res.status(404).type("text").send("Not found");
    const jpg = await storyImage(found.store, item);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=3600");
    return res.send(jpg);
  } catch (error) {
    console.error("Story image error:", error.message);
    return res.status(500).type("text").send("Couldn't make this story");
  }
});

// GET /api/stories/:token — the "Save all to Photos" page
router.get("/:token", async (req, res) => {
  try {
    const found = await load(req, res);
    if (!found) return;
    const { store, items } = found;
    const base = `${process.env.BACKEND_URL}/api/stories/${encodeURIComponent(req.params.token)}`;
    const cards = items
      .map((item, i) => {
        const n = i + 1;
        return `
        <figure>
          <img src="${base}/${n}.jpg" alt="${escapeHtml(item.name)}" loading="lazy" data-file="${escapeHtml(fileName(item, i))}" />
          <figcaption>
            <b>${String(n).padStart(2, "0")}</b> ${escapeHtml(item.name)}
            <span>${escapeHtml([item.size, item.price].filter(Boolean).join(" · "))}</span>
            <button type="button" data-copy="${escapeHtml(item.url)}">Copy item link</button>
          </figcaption>
        </figure>`;
      })
      .join("");

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>New arrival stories · ${escapeHtml(store.name)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0a0a0a; color: #fafafa; font: 15px/1.5 -apple-system, system-ui, sans-serif; }
  main { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p { color: #a1a1a1; margin: 0 0 16px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .actions a, .actions button { font: inherit; font-weight: 600; padding: 10px 16px; border-radius: 8px; border: 1px solid #262626; background: #161616; color: #fafafa; text-decoration: none; cursor: pointer; }
  .actions .primary { background: #fafafa; color: #0a0a0a; border-color: #fafafa; }
  #status { min-height: 1.5em; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
  figure { margin: 0; }
  img { width: 100%; aspect-ratio: 9 / 16; object-fit: cover; border-radius: 8px; background: #161616; display: block; }
  figcaption { font-size: 13px; margin-top: 6px; display: flex; flex-direction: column; gap: 2px; }
  figcaption span { color: #a1a1a1; }
  figcaption button { margin-top: 4px; font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid #262626; background: #161616; color: #fafafa; cursor: pointer; }
</style>
</head>
<body>
<main>
  <h1>${items.length} new arrival ${items.length === 1 ? "story" : "stories"}</h1>
  <p>${escapeHtml(store.name)} · Save them to your phone, add one to your Instagram story, then add a link sticker with that item's link.</p>
  ${
    items.length
      ? `<div class="actions">
    <button type="button" class="primary" id="save-all">Save all to Photos</button>
    <a href="${base}/zip">Download zip</a>
  </div>
  <div id="status" role="status"></div>
  <div class="grid">${cards}</div>`
      : `<p>These items have all sold out.</p>`
  }
</main>
<script>
  const status = document.getElementById("status");
  document.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied"; }
      catch { window.prompt("Copy this link", b.dataset.copy); }
      setTimeout(() => (b.textContent = "Copy item link"), 2000);
    }),
  );
  const saveAll = document.getElementById("save-all");
  if (saveAll) saveAll.addEventListener("click", async () => {
    const imgs = [...document.querySelectorAll("img[data-file]")];
    status.textContent = "Getting " + imgs.length + " stories ready…";
    try {
      const files = await Promise.all(imgs.map(async (img) => {
        const blob = await (await fetch(img.src)).blob();
        return new File([blob], img.dataset.file, { type: "image/jpeg" });
      }));
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files });
        status.textContent = "Choose \\"Save Images\\" to put them in Photos.";
      } else {
        status.textContent = "This browser can't save them all at once — downloading the zip instead.";
        location.href = "${base}/zip";
      }
    } catch (e) {
      status.textContent = e && e.name === "AbortError" ? "" : "Couldn't save them all. Try Download zip.";
    }
  });
</script>
</body>
</html>`);
  } catch (error) {
    console.error("Stories page error:", error.message);
    return res.status(500).type("text").send("Couldn't load these stories. Try again in a minute.");
  }
});

module.exports = router;
