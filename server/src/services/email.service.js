require("dotenv").config();
const { Resend } = require("resend");
const { renderEmail, productCard, button, escapeHtml } = require("./emailLayout.js");

let resend = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn(
    "Resend not configured — RESEND_API_KEY missing, email sending will be disabled",
  );
}

const greeting = (account) =>
  `Hi${account.full_name ? ` ${escapeHtml(account.full_name)}` : ""}`;

// "Size 10M/11.5W — $215"; trading cards have no size
const itemDetails = (item) =>
  [item.size && `Size ${item.size}`, item.price && `$${item.price}`]
    .filter(Boolean)
    .join(" — ");

const unsubscribeNote = (storeName) =>
  `You're getting this because you set alerts at ${escapeHtml(storeName)}. Change or turn off email alerts anytime in your profile.`;

const sendAlertEmail = async ({ store, account, inventory }) => {
  if (!resend) {
    console.warn("Skipping email - Resend not configured");
    return;
  }

  const fromEmail =
    store.notification_from_email || process.env.RESEND_FROM_EMAIL;
  const fromName = store.name;
  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    subject: `${inventory.product_name} is back in stock`,
    html: renderEmail({
      preheader: `${inventory.product_name} is back at ${fromName}`,
      heading: "It's back in stock.",
      intro: `${greeting(account)}, something you're tracking just came back at ${escapeHtml(fromName)}.`,
      bodyHtml: productCard({
        name: inventory.product_name,
        details: itemDetails(inventory),
        imageUrl: inventory.image_url,
        href: inventory.shopify_url,
      }),
      footer: unsubscribeNote(fromName),
    }),
  });
};

const sendPriceDropEmail = async ({ store, account, inventory }) => {
  if (!resend) {
    console.warn("Skipping email - Resend not configured");
    return;
  }

  const fromEmail =
    store.notification_from_email || process.env.RESEND_FROM_EMAIL;
  const fromName = store.name;
  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    subject: `${inventory.product_name} price drop`,
    html: renderEmail({
      preheader: `${inventory.product_name} dropped to $${inventory.price}`,
      heading: "Price drop.",
      intro: `${greeting(account)}, something you're tracking just got cheaper at ${escapeHtml(fromName)}.`,
      bodyHtml: productCard({
        name: inventory.product_name,
        details: itemDetails(inventory),
        imageUrl: inventory.image_url,
        href: inventory.shopify_url,
      }),
      footer: unsubscribeNote(fromName),
    }),
  });
};

// Two kinds of match, each with its own wording and tag:
//   alerts — items the shopper set an alert for (has an alert_id)
//   sizes  — anything new in their saved sizes, from the size-alerts
//            toggle (no alert behind it)
// A shopper gets ONE email per batch. With only one kind it uses that
// kind's template; with both, one email with a section for each.
const DIGEST_KINDS = {
  alerts: {
    section: "Your alerts",
    label: "Your alert",
    subject: (n) => (n === 1 ? "Your alert just hit" : `${n} of your alerts just hit`),
    heading: "Your alert just hit.",
    intro: (n) =>
      n === 1 ? "something you're tracking is available" : `${n} things you're tracking are available`,
    footer: (store) =>
      `You set alerts at ${store}. Manage or delete them, or turn off email, in your profile.`,
  },
  sizes: {
    section: "New in your size",
    label: "In your size",
    subject: (n) => (n === 1 ? "New in your size" : `${n} new arrivals in your size`),
    heading: "New in your size.",
    intro: (n) =>
      n === 1 ? "a new arrival just landed in your saved sizes" : `${n} new arrivals just landed in your saved sizes`,
    footer: (store) =>
      `Size alerts are on at ${store}. Turn them off, or change your sizes, in your profile.`,
  },
};

const cardsFor = (items, label) =>
  items
    .map((item) =>
      productCard({
        name: item.product_name,
        details: itemDetails(item),
        imageUrl: item.image_url,
        href: item.shopify_url,
        label,
      }),
    )
    .join("");

const sectionTitle = (text) =>
  `<p class="ss-muted" style="margin: 24px 0 12px; font-size: 12px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #a1a1a1;">${escapeHtml(text)}</p>`;

const sendDigestEmail = async ({ store, account, alerts = [], sizes = [] }) => {
  if (!resend) {
    console.warn("Skipping email - Resend not configured");
    return;
  }

  const fromEmail =
    store.notification_from_email || process.env.RESEND_FROM_EMAIL;
  const fromName = store.name;
  const storeHtml = escapeHtml(fromName);
  const parts = [
    ["alerts", alerts],
    ["sizes", sizes],
  ].filter(([, items]) => items.length > 0);
  if (parts.length === 0) return;

  const both = parts.length === 2;
  const [firstKind, firstItems] = parts[0];
  const first = DIGEST_KINDS[firstKind];

  const subject = both
    ? `${first.subject(firstItems.length)} + ${sizes.length} new in your size at ${fromName}`
    : `${first.subject(firstItems.length)} at ${fromName}`;
  const intro = both
    ? `${greeting(account)}, ${DIGEST_KINDS.alerts.intro(alerts.length)} at ${storeHtml}, and ${DIGEST_KINDS.sizes.intro(sizes.length)}.`
    : `${greeting(account)}, ${first.intro(firstItems.length)} at ${storeHtml}.`;
  const bodyHtml = parts
    .map(([kind, items]) => {
      const k = DIGEST_KINDS[kind];
      return `${both ? sectionTitle(k.section) : ""}${cardsFor(items, k.label)}`;
    })
    .join("");
  const footer = parts.map(([kind]) => DIGEST_KINDS[kind].footer(storeHtml)).join(" ");

  // Resend returns API failures instead of throwing — throw so the
  // digest service can requeue the items
  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    subject,
    html: renderEmail({
      preheader: both ? "Your alerts, plus new arrivals in your size" : first.intro(firstItems.length),
      heading: first.heading,
      intro,
      bodyHtml,
      footer,
    }),
  });
  if (error) throw new Error(error.message || "Digest email failed");
};

const sendPasswordResetEmail = async ({
  store,
  account,
  resetUrl,
  googleOnly,
}) => {
  if (!resend) {
    console.warn("Skipping email - Resend not configured");
    return;
  }

  const fromName = store?.name || "Syncstock";
  const fromEmail =
    store?.notification_from_email || process.env.RESEND_FROM_EMAIL;
  const ignoreNote = "If you didn't request this, you can safely ignore this email.";

  if (googleOnly) {
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: account.email,
      subject: `Password reset requested`,
      html: renderEmail({
        preheader: "Your account signs in with Google",
        heading: "Password reset requested",
        intro: `${greeting(account)}, someone asked to reset the password for this email, but your account uses Google sign-in and has no password. Just continue signing in with Google.`,
        footer: ignoreNote,
      }),
    });
    return;
  }

  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    subject: `Reset your password`,
    html: renderEmail({
      preheader: "This link expires in 1 hour",
      heading: "Reset your password",
      intro: `${greeting(account)}, use the button below to choose a new password. This link expires in 1 hour.`,
      bodyHtml: button(resetUrl, "Reset password"),
      footer: ignoreNote,
    }),
  });
};

module.exports = {
  sendAlertEmail,
  sendPriceDropEmail,
  sendDigestEmail,
  sendPasswordResetEmail,
};
