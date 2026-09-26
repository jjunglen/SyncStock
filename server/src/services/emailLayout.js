// Shared HTML layout for every email Syncstock sends.
//
// Contrast-inverting theme: readers whose device is in LIGHT mode get the
// dark template; readers in DARK mode get the light one. The dark colors
// are inline (the default every client respects); the light version is
// applied by a prefers-color-scheme: dark media query (Apple Mail, iOS
// Mail, Outlook for Mac, and others) plus Outlook.com's [data-ogsc]
// dark-mode hook. Clients that ignore media queries (Gmail) always show
// the dark template. Tables and inline styles keep it working in Outlook
// for Windows.

const DARK = {
  page: "#050505",
  body: "#0a0a0a",
  card: "#161616",
  border: "#262626",
  text: "#fafafa",
  muted: "#a1a1a1",
};

const LIGHT = {
  page: "#f4f4f5",
  body: "#ffffff",
  card: "#f4f4f5",
  border: "#e4e4e7",
  text: "#0a0a0a",
  muted: "#52525b",
};

const ACCENT = "#378ADD"; // readable on both themes

// Product names and other values come from Shopify / user input
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const lightOverrides = (prefix) => `
  ${prefix} .ss-page { background: ${LIGHT.page} !important; }
  ${prefix} .ss-body { background: ${LIGHT.body} !important; border-color: ${LIGHT.border} !important; }
  ${prefix} .ss-card { background: ${LIGHT.card} !important; border-color: ${LIGHT.border} !important; }
  ${prefix} .ss-text { color: ${LIGHT.text} !important; }
  ${prefix} .ss-muted { color: ${LIGHT.muted} !important; }
  ${prefix} .ss-rule { border-color: ${LIGHT.border} !important; }
`;

const button = (href, label) => `
  <a href="${escapeHtml(href)}" style="display: inline-block; background: ${ACCENT}; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">${escapeHtml(label)}</a>`;

// preheader: the preview line inboxes show next to the subject
// unsubscribeHref: adds a visible "Unsubscribe" link after the footer
const renderEmail = ({ preheader = "", heading, intro, bodyHtml = "", footer, unsubscribeHref }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {${lightOverrides("")}}
    ${lightOverrides("[data-ogsc]")}
  </style>
</head>
<body class="ss-page" style="margin: 0; padding: 0; background: ${DARK.page};">
  <div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ss-page" style="background: ${DARK.page};">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ss-body" style="max-width: 600px; background: ${DARK.body}; border: 1px solid ${DARK.border}; border-radius: 12px;">
          <tr>
            <td style="padding: 32px; font-family: Arial, Helvetica, sans-serif;">
              <h1 class="ss-text" style="margin: 0 0 8px; font-size: 24px; color: ${DARK.text};">${heading}</h1>
              <p class="ss-muted" style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: ${DARK.muted};">${intro}</p>
              ${bodyHtml}
              ${
                footer
                  ? `<p class="ss-muted ss-rule" style="margin: 24px 0 0; padding-top: 16px; border-top: 1px solid ${DARK.border}; font-size: 12px; line-height: 1.5; color: ${DARK.muted};">${footer}${
                      unsubscribeHref
                        ? ` <a href="${escapeHtml(unsubscribeHref)}" class="ss-muted" style="color: ${DARK.muted}; text-decoration: underline;">Unsubscribe</a>`
                        : ""
                    }</p>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// One product row: photo on a white tile (photos are shot on white),
// name, details, and a button
// label: small pill above the name ("Your alert", "Size 10M/11.5W")
const productCard = ({ name, details, imageUrl, href, cta = "View →", label }) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ss-card" style="background: ${DARK.card}; border: 1px solid ${DARK.border}; border-radius: 10px; margin-bottom: 16px;">
    <tr>
      <td style="padding: 20px;">
        ${
          imageUrl
            ? `<div style="background: #ffffff; border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center;">
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" width="220" style="max-width: 220px; width: 100%; height: auto;" />
        </div>`
            : ""
        }
        ${
          label
            ? `<p style="margin: 0 0 8px;"><span style="display: inline-block; background: rgba(55, 138, 221, 0.15); color: ${ACCENT}; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 999px;">${escapeHtml(label)}</span></p>`
            : ""
        }
        <p class="ss-text" style="margin: 0 0 4px; font-weight: bold; font-size: 16px; color: ${DARK.text};">${escapeHtml(name)}</p>
        <p class="ss-muted" style="margin: 0 0 16px; font-size: 14px; color: ${DARK.muted};">${escapeHtml(details)}</p>
        ${href ? button(href, cta) : ""}
      </td>
    </tr>
  </table>`;

// Compact row for alert emails: small thumbnail, linked name, details.
// Deliberately light — big photo grids with a button per product read as
// a sale flyer to Gmail and get filed under Promotions.
const itemRow = ({ name, details, imageUrl, href }) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ss-rule" style="border-bottom: 1px solid ${DARK.border};">
    <tr>
      ${
        imageUrl
          ? `<td width="64" style="padding: 12px 12px 12px 0; vertical-align: middle;">
        <img src="${escapeHtml(imageUrl)}" alt="" width="56" height="56" style="display: block; width: 56px; height: 56px; object-fit: contain; background: #ffffff; border-radius: 8px;" />
      </td>`
          : ""
      }
      <td style="padding: 12px 0; vertical-align: middle; font-family: Arial, Helvetica, sans-serif;">
        <a href="${escapeHtml(href)}" class="ss-text" style="color: ${DARK.text}; font-size: 15px; font-weight: bold; text-decoration: none;">${escapeHtml(name)}</a>
        <p class="ss-muted" style="margin: 2px 0 0; font-size: 13px; color: ${DARK.muted};">${escapeHtml(details)}</p>
      </td>
    </tr>
  </table>`;

module.exports = { renderEmail, productCard, itemRow, button, escapeHtml };
