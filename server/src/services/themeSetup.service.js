const { User, Account } = require("../models/index.js");
const { shopifyGraphql } = require("../utils/shopifyGraphql.js");
const { APPS } = require("../utils/shopifyApps.js");
const { appInstallation } = require("./channel.service.js");
const { sendStoreEmail } = require("./email.service.js");
const { renderEmail, button, escapeHtml } = require("./emailLayout.js");

// Whether SyncStock is on the store's live Shopify theme: the floating
// "Restock alerts" button (app embed, blocks/restock-button.liquid) and the
// "Restock alerts" section (blocks/restock-banner.liquid) on the home page.
//
// Shopify doesn't let an App Store app put itself on a theme: the merchant
// switches it on and clicks Save. Switching themes leaves it behind, quietly.
// So SyncStock reads the live theme (read_themes, read-only) when a theme
// is published (themes/publish webhook), nightly, and when the merchant
// opens Store settings or the dashboard. The dashboard then offers the
// one-click link, and a theme change that dropped it sends one email.

// Read-only theme access. Asked for on install (store.controller.js
// appScopes); stores connected before it approve it once.
const THEME_SCOPES = ["read_themes"];
const hasThemeScope = (scopes) => THEME_SCOPES.every((s) => scopes.includes(s));

const SETTINGS_FILE = "config/settings_data.json";
// Present only on themes built from sections (JSON templates). Themes that
// write each page in code have templates/index.liquid instead, and Shopify's
// editor can't add app sections to them.
const HOME_TEMPLATE = "templates/index.json";

// One-click links into the store's theme editor: the section ready to add,
// and App embeds with the button switched on (the merchant clicks Save).
// Each needs the client ID of the app the store installed — public, it's
// in the app's TOML file.
const themeLinks = (store) => {
  const clientId = APPS[store.shopify_app || "custom"]?.clientId();
  if (!clientId || !store.shopify_domain) return null;
  const editor = `https://${store.shopify_domain}/admin/themes/current/editor`;
  return {
    section: `${editor}?template=index&addAppBlockId=${clientId}/restock-banner&target=newAppsSection`,
    button: `${editor}?context=apps&template=index&activateAppId=${clientId}/restock-button`,
  };
};

// A theme file's text, however Shopify hands it over
const fileText = async (file) => {
  const body = file?.body;
  if (!body) return null;
  if (typeof body.content === "string") return body.content;
  if (typeof body.contentBase64 === "string") return Buffer.from(body.contentBase64, "base64").toString("utf8");
  if (typeof body.url === "string") {
    const resp = await fetch(body.url, { signal: AbortSignal.timeout(10000) });
    return resp.ok ? resp.text() : null;
  }
  return null;
};

// Shopify starts theme JSON files with a /* … */ note
const parseThemeJson = (text) => {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ""));
  } catch {
    return null;
  }
};

// An app block's type: shopify://apps/<app handle>/blocks/<block>/<id>
const blockPrefix = (appHandle, block) => `shopify://apps/${appHandle}/blocks/${block}/`;

// App embeds live in settings_data.json's current settings — an object, or
// on older themes the name of a preset holding them
const buttonOn = (settings, appHandle) => {
  const current = typeof settings?.current === "string" ? settings.presets?.[settings.current] : settings?.current;
  const prefix = blockPrefix(appHandle, "restock-button");
  return Object.values(current?.blocks || {}).some(
    (block) => typeof block?.type === "string" && block.type.startsWith(prefix) && !block.disabled,
  );
};

// The section anywhere on the home page (inside a theme section, or in
// the "Apps" section the editor wraps it in)
const bannerOnHome = (template, appHandle) =>
  JSON.stringify(template?.sections || {}).includes(blockPrefix(appHandle, "restock-banner"));

const THEME_QUERY = `query ($files: [String!]) {
  themes(first: 1, roles: [MAIN]) {
    nodes {
      id
      name
      files(filenames: $files, first: 2) {
        nodes {
          filename
          body {
            ... on OnlineStoreThemeFileBodyText { content }
            ... on OnlineStoreThemeFileBodyBase64 { contentBase64 }
            ... on OnlineStoreThemeFileBodyUrl { url }
          }
        }
      }
    }
  }
}`;

// What's on the live theme now. Never changes the theme.
const readThemeStatus = async (store) => {
  const { appHandle, scopes } = await appInstallation(store);
  const checked_at = new Date().toISOString();
  if (!hasThemeScope(scopes)) return { access: false, checked_at };

  const data = await shopifyGraphql(store, THEME_QUERY, { files: [SETTINGS_FILE, HOME_TEMPLATE] });
  const theme = data.themes?.nodes?.[0];
  if (!theme) return { access: true, theme_id: null, checked_at };

  const files = {};
  for (const file of theme.files?.nodes || []) files[file.filename] = await fileText(file);
  const home = parseThemeJson(files[HOME_TEMPLATE]);

  return {
    access: true,
    theme_id: theme.id,
    theme_name: theme.name,
    button_on: buttonOn(parseThemeJson(files[SETTINGS_FILE]), appHandle),
    sections: !!home,
    banner_on_home: bannerOnHome(home, appHandle),
    checked_at,
  };
};

// A newly published theme dropped what the old one had: one email to the
// store's admins (per theme), with the link that puts it back
const emailThemeChange = async (store, status, lost) => {
  const links = themeLinks(store);
  if (!links) return;
  const buttonLost = lost.includes("button");
  const action = buttonLost
    ? { href: links.button, label: "Turn the button back on" }
    : { href: `${process.env.FRONTEND_URL}/settings`, label: "Open Store settings" };
  const what = lost
    .map((key) => (key === "button" ? "the floating Restock alerts button" : "the Restock alerts section"))
    .join(" and ");
  const sectionNote =
    lost.includes("section") && !status.sections
      ? " This theme writes its pages in code, so Shopify can't add app sections to it; the floating button works on any theme."
      : "";
  const intro = `You published a new theme${status.theme_name ? `, ${status.theme_name}` : ""}, and it doesn't have ${what} yet. Shopify keeps app settings per theme, so they don't carry over on their own.`;

  const admins = await User.findAll({
    where: { store_id: store.id, role: "admin" },
    include: [{ model: Account, attributes: ["email", "full_name"] }],
  });
  for (const admin of admins) {
    if (!admin.Account?.email) continue;
    await sendStoreEmail({
      fromName: "Syncstock",
      to: admin.Account.email,
      subject: `Your new theme is missing SyncStock's restock alerts ${buttonLost ? "button" : "section"}`,
      html: renderEmail({
        preheader: "One click puts it back. Then click Save in Shopify.",
        heading: "Put restock alerts back on your store",
        intro: `Hi${admin.Account.full_name ? ` ${escapeHtml(admin.Account.full_name)}` : ""}, ${escapeHtml(intro)}${escapeHtml(sectionNote)}`,
        bodyHtml: `${button(action.href, action.label)}
          <p class="ss-muted" style="margin: 16px 0 0; font-size: 13px; color: #a1a1a1;">The link opens your theme editor with it ready. Click Save in Shopify to publish it.</p>`,
        footer: `You're getting this because you run ${escapeHtml(store.name)} on SyncStock. One email per theme.`,
      }),
      text: [intro + sectionNote, "", `${action.label}: ${action.href}`, "Then click Save in Shopify to publish it."].join("\n"),
    });
  }
};

// Reads the live theme, saves what it found, and emails once when a theme
// change dropped the button or section. Returns the status.
const checkThemeSetup = async (store) => {
  const previous = store.theme_status || null;
  const status = await readThemeStatus(store);
  await store.update({ theme_status: status });

  const themeChanged = previous?.access && status.access && previous.theme_id && status.theme_id && previous.theme_id !== status.theme_id;
  if (themeChanged && store.theme_prompt_sent_for !== status.theme_id) {
    const lost = [];
    if (previous.button_on && !status.button_on) lost.push("button");
    if (previous.banner_on_home && !status.banner_on_home) lost.push("section");
    if (lost.length) {
      await store.update({ theme_prompt_sent_for: status.theme_id });
      await emailThemeChange(store, status, lost).catch((err) =>
        console.error(`Theme change email failed for ${store.shopify_domain}:`, err.message),
      );
    }
  }
  return status;
};

module.exports = { THEME_SCOPES, hasThemeScope, themeLinks, checkThemeSetup };
