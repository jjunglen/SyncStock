const { QueryTypes, Op } = require("sequelize");
const { sequelize, Store, User, Account, Inventory } = require("../models/index.js");
const { storyStyle, sizeLine, priceLine } = require("../utils/storyDetails.js");

// The image and zip packages load on first use, not at server start — if
// one ever failed to install, only stories would break
const renderStory = (...args) => require("./storyImage.service.js").renderStory(...args);
const zipArchive = async (options) => {
  const { ZipArchive } = await import("archiver");
  return new ZipArchive(options);
};
const { renderEmail, button, escapeHtml } = require("./emailLayout.js");
const { sendStoreEmail } = require("./email.service.js");
const { enabledCategories } = require("../utils/storeSettings.js");
const { signStoriesToken } = require("../utils/jwt.js");

// New-arrival Instagram stories, emailed to stores that turned them on
// (Store settings). Each email covers every product first seen since the
// last one: a zip of 1080×1920 story images, a numbered list of each
// item's page (for Instagram's link sticker), and a link to a page that
// saves them all to a phone's Photos.
//
// When (story_frequency):
//   "daily" — 9am Central, if there's anything new
//   "batch" — 15 minutes after new items stop arriving, once there are 2
//             or more (a lone item waits for the next batch, or 9am)

const MAX_STORIES = 150; // a whole first catalog import isn't "new"
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // Resend allows 40 MB
const DAY_MS = 24 * 60 * 60 * 1000;
const QUIET_MS = 15 * 60 * 1000; // "batch": how long after the last new item

// Products whose first variant appeared in (from, to], oldest first.
// Products from the store's first catalog import (its first 6 hours of
// inventory) never count — that's the whole store, not new arrivals.
const newProductIds = async (store, from, to) => {
  const rows = await sequelize.query(
    `
    WITH firsts AS (
      SELECT shopify_product_id, MIN(created_at) AS first_seen
      FROM inventory WHERE store_id = :storeId
      GROUP BY shopify_product_id
    ),
    import AS (
      SELECT MIN(created_at) + INTERVAL '6 hours' AS done
      FROM inventory WHERE store_id = :storeId
    )
    SELECT f.shopify_product_id
    FROM firsts f, import
    WHERE f.first_seen > :from AND f.first_seen <= :to AND f.first_seen > import.done
    ORDER BY f.first_seen ASC
    LIMIT ${MAX_STORIES}
    `,
    { replacements: { storeId: store.id, from, to }, type: QueryTypes.SELECT },
  );
  return rows.map((r) => r.shopify_product_id);
};

// When the newest product since `from` first appeared (or null) — a
// batch is done once this is 15 minutes old. Counts every new product,
// even ones not posted (no photo yet), since they're part of the import.
const lastArrivalAt = async (store, from) => {
  const [row] = await sequelize.query(
    `
    SELECT MAX(first_seen) AS last FROM (
      SELECT MIN(created_at) AS first_seen
      FROM inventory WHERE store_id = :storeId
      GROUP BY shopify_product_id
    ) f WHERE f.first_seen > :from
    `,
    { replacements: { storeId: store.id, from }, type: QueryTypes.SELECT },
  );
  return row?.last ? new Date(row.last) : null;
};

// The new arrivals that are still worth posting: in stock, with a photo,
// in a category the store shows. [{ product_id, name, url, size, price, variants }]
const findNewArrivals = async (store, from, to) => {
  const ids = await newProductIds(store, from, to);
  if (ids.length === 0) return [];
  const variants = await Inventory.findAll({
    where: {
      store_id: store.id,
      shopify_product_id: { [Op.in]: ids },
      available: { [Op.gt]: 0 },
      image_url: { [Op.ne]: null },
      category: { [Op.in]: enabledCategories(store) },
    },
    order: [["created_at", "ASC"]],
  });
  const byProduct = new Map();
  for (const v of variants) {
    if (!byProduct.has(v.shopify_product_id)) byProduct.set(v.shopify_product_id, []);
    byProduct.get(v.shopify_product_id).push(v);
  }
  // Resale stores often list identical units as separate products (four
  // packs of the same socks, each with its own page) — one story each
  // would be four identical images, so the first one stands for them all
  const seen = new Set();
  return ids
    .filter((id) => byProduct.has(id))
    .map((id) => {
      const list = byProduct.get(id);
      return {
        product_id: id,
        name: list[0].product_name,
        url: list[0].shopify_url,
        size: sizeLine(list),
        price: priceLine(list),
        variants: list,
      };
    })
    .filter((item) => {
      const key = `${item.name.toLowerCase()}|${item.size}|${item.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

// Rendered stories, kept for an hour — the email, the zip and the save
// page all ask for the same images
const CACHE_MS = 60 * 60 * 1000;
const CACHE_MAX = 300;
const cache = new Map();
// The store's own logo (Branding), if it has one. logo_data is left out
// of normal store queries, so it's read here, once per logo version.
const logoCache = new Map();
const storeLogo = async (store) => {
  if (!store.logo_updated_at) return null;
  const key = `${store.id}:${new Date(store.logo_updated_at).getTime()}`;
  if (!logoCache.has(key)) {
    const row = await Store.unscoped().findByPk(store.id, { attributes: ["logo_data"] });
    logoCache.set(key, row?.logo_data ? { key, data: row.logo_data } : null);
  }
  return logoCache.get(key);
};

const storyImage = async (store, item) => {
  const style = { ...storyStyle(store), logo: await storeLogo(store) };
  const key = `${store.id}:${item.product_id}:${item.size}:${item.price}:${style.background}${style.box}${style.text}:${style.font}:${style.logo?.key || "syncstock"}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.jpg;
  const jpg = await renderStory(item.variants, style);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { jpg, at: Date.now() });
  return jpg;
};

// Renders a few at a time. A product whose photo fails is skipped (null).
const renderAll = async (store, items, concurrency = 4) => {
  const out = new Array(items.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await storyImage(store, items[i]);
      } catch (err) {
        console.error(`Story render failed for ${items[i].name}:`, err.message);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
};

const slug = (name) =>
  String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "item";

// "01-nike-ja-4-nightmare.jpg" — numbered to match the email's list
const fileName = (item, i) => `${String(i + 1).padStart(2, "0")}-${slug(item.name)}.jpg`;

// The zip: every story plus links.txt (number → item page)
const buildZip = async (items, images) => {
  const zip = await zipArchive({ store: true }); // JPEGs don't compress further
  return new Promise((resolve, reject) => {
    const chunks = [];
    zip.on("data", (c) => chunks.push(c));
    zip.on("end", () => resolve(Buffer.concat(chunks)));
    zip.on("error", reject);
    const links = [];
    items.forEach((item, i) => {
      if (!images[i]) return;
      zip.append(images[i], { name: fileName(item, i) });
      links.push(`${String(i + 1).padStart(2, "0")}  ${item.name}\n    ${item.url}`);
    });
    zip.append(`${links.join("\n\n")}\n`, { name: "links.txt" });
    zip.finalize();
  });
};

const storiesPageUrl = (token) => `${process.env.BACKEND_URL}/api/stories/${token}`;

// "Oct 22" (or "Oct 22, 2:15 PM" for batches) in Central time
const dayLabel = (date, withTime = false) =>
  new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(withTime && { hour: "numeric", minute: "2-digit" }),
    timeZone: "America/Chicago",
  });
const dayStamp = (date) =>
  new Date(date).toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); // 2026-10-22

const emailBody = (items, images, pageUrl, zipUrl) => {
  const rows = items
    .map((item, i) => {
      if (!images[i]) return "";
      const n = String(i + 1).padStart(2, "0");
      const details = [item.size, item.price].filter(Boolean).join(" · ");
      return `
      <tr>
        <td class="ss-muted" style="padding: 10px 10px 10px 0; font-size: 13px; color: #a1a1a1; vertical-align: top; width: 24px;">${n}</td>
        <td style="padding: 10px 0; font-size: 14px;">
          <span class="ss-text" style="color: #fafafa; font-weight: bold;">${escapeHtml(item.name)}</span><br />
          ${details ? `<span class="ss-muted" style="color: #a1a1a1; font-size: 13px;">${escapeHtml(details)}</span><br />` : ""}
          <a href="${escapeHtml(item.url)}" style="color: #378ADD; font-size: 13px; word-break: break-all;">${escapeHtml(item.url)}</a>
        </td>
      </tr>`;
    })
    .join("");
  return `
    <p style="margin: 0 0 20px;">${button(pageUrl, "Save all to Photos")}</p>
    ${zipUrl ? `<p class="ss-muted" style="margin: 0 0 20px; font-size: 13px; color: #a1a1a1;">Too many to attach today — <a href="${escapeHtml(zipUrl)}" style="color: #378ADD;">download the zip</a>.</p>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">${rows}</table>
    <p class="ss-muted" style="margin: 0; font-size: 13px; color: #a1a1a1;">To post one: add the image to your Instagram story, tap the sticker icon, choose Link, and paste that item's link.</p>`;
};

// Emails one store's new arrivals from (from, to] to `recipients`
// ([{ email, full_name }]). `items` (from findNewArrivals) can be passed
// in when already loaded. Returns how many stories were sent.
const sendStoriesEmail = async (store, { from, to, recipients, items: given, limit = MAX_STORIES }) => {
  const items = (given || (await findNewArrivals(store, from, to))).slice(0, limit);
  if (items.length === 0 || recipients.length === 0) return 0;

  const images = await renderAll(store, items);
  const count = images.filter(Boolean).length;
  if (count === 0) return 0;

  const token = signStoriesToken(store.id, from, to);
  const pageUrl = storiesPageUrl(token);
  const zip = await buildZip(items, images);
  const attach = zip.length <= MAX_ATTACHMENT_BYTES;
  const zipUrl = attach ? null : `${pageUrl}/zip`;
  const zipName = `${slug(store.name)}-new-arrivals-${dayStamp(to)}.zip`;
  const plural = count === 1 ? "story" : "stories";

  for (const r of recipients) {
    await sendStoreEmail({
      fromName: "Syncstock",
      to: r.email,
      subject: `${count} new arrival ${plural} for Instagram — ${dayLabel(to, store.story_frequency === "batch")}`,
      html: renderEmail({
        preheader: `${count} ready-to-post Instagram ${plural} from ${store.name}'s new arrivals`,
        heading: "New arrivals for your story",
        intro: `Hi${r.full_name ? ` ${escapeHtml(r.full_name)}` : ""}, here ${count === 1 ? "is" : "are"} ${count} Instagram ${plural} for ${escapeHtml(store.name)}'s newest items.${attach ? " They're in the attached zip, numbered to match the list below." : ""}`,
        bodyHtml: emailBody(items, images, pageUrl, zipUrl),
        footer:
          store.story_frequency === "batch"
            ? "Sent 15 minutes after a batch of new arrivals. Change this in Store settings."
            : "Sent each morning there are new arrivals. Change this in Store settings.",
      }),
      text: [
        `${count} new arrival ${plural} for Instagram from ${store.name}.`,
        `Save them all to your phone: ${pageUrl}`,
        zipUrl ? `Download the zip: ${zipUrl}` : "They're in the attached zip.",
        "",
        ...items.flatMap((item, i) =>
          images[i]
            ? [`${String(i + 1).padStart(2, "0")}. ${item.name}${item.size ? ` — ${item.size}` : ""}${item.price ? ` — ${item.price}` : ""}`, `    ${item.url}`]
            : [],
        ),
        "",
        "Turn this email off in Store settings.",
      ].join("\n"),
      attachments: attach ? [{ filename: zipName, content: zip }] : undefined,
    });
  }
  return count;
};

const storeAdmins = async (store) => {
  const admins = await User.findAll({
    where: { store_id: store.id, role: "admin" },
    include: [{ model: Account, attributes: ["email", "full_name"] }],
  });
  return admins.map((a) => a.Account).filter((a) => a?.email);
};

// One store's pending stories, if it's time. The window always starts
// where the last email stopped, so nothing is skipped or sent twice.
//   daily (9am run):     send anything new
//   batch (every 5 min): send once there are 2+ and the last arrived 15+
//                        minutes ago; at 9am, a lone leftover goes too
const running = new Set(); // a slow send must not overlap the next run
const processStore = async (store, { atNine }) => {
  if (running.has(store.id)) return 0;
  running.add(store.id);
  try {
    const now = new Date();
    const from = store.stories_checked_at || new Date(now.getTime() - DAY_MS);
    const batch = store.story_frequency === "batch";

    if (batch) {
      const last = await lastArrivalAt(store, from);
      if (!last) return 0; // nothing new
      if (now - last < QUIET_MS) return 0; // still arriving — wait
    }
    const items = await findNewArrivals(store, from, now);
    if (batch && !atNine && items.length < 2) return 0; // a lone item waits

    const count = items.length
      ? await sendStoriesEmail(store, { from, to: now, items, recipients: await storeAdmins(store) })
      : 0;
    await store.update({ stories_checked_at: now });
    if (count) console.log(`Instagram stories: ${count} sent for ${store.subdomain} (${store.story_frequency})`);
    return count;
  } finally {
    running.delete(store.id);
  }
};

const storesWithStories = (where = {}) =>
  Store.findAll({ where: { status: "active", uninstalled_at: null, instagram_stories: true, ...where } });

// 9am Central (server.js): every store with stories on
const sendDailyStories = async () => {
  const stores = await storesWithStories();
  let sent = 0;
  for (const store of stores) {
    try {
      if (await processStore(store, { atNine: true })) sent++;
    } catch (error) {
      console.error(`Instagram stories failed for ${store.subdomain}:`, error.message);
    }
  }
  console.log(`Instagram stories emails sent for ${sent} of ${stores.length} stores`);
};

// Every 5 minutes (server.js): stores that want stories after each batch
const sendBatchStories = async () => {
  for (const store of await storesWithStories({ story_frequency: "batch" })) {
    try {
      await processStore(store, { atNine: false });
    } catch (error) {
      console.error(`Instagram stories (batch) failed for ${store.subdomain}:`, error.message);
    }
  }
};

// The latest in-stock product, for the settings page preview
const latestItem = async (store) => {
  const newest = await Inventory.findOne({
    where: {
      store_id: store.id,
      available: { [Op.gt]: 0 },
      image_url: { [Op.ne]: null },
      category: { [Op.in]: enabledCategories(store) },
    },
    order: [["created_at", "DESC"]],
  });
  if (!newest) return null;
  const variants = await Inventory.findAll({
    where: { store_id: store.id, shopify_product_id: newest.shopify_product_id, available: { [Op.gt]: 0 } },
  });
  return {
    product_id: newest.shopify_product_id,
    name: newest.product_name,
    url: newest.shopify_url,
    size: sizeLine(variants),
    price: priceLine(variants),
    variants,
  };
};

module.exports = {
  findNewArrivals,
  renderAll,
  storyImage,
  buildZip,
  fileName,
  sendStoriesEmail,
  sendDailyStories,
  sendBatchStories,
  processStore,
  latestItem,
  DAY_MS,
};
