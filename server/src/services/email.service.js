require("dotenv").config();
const { Resend } = require("resend");
const { renderEmail, productCard, itemRow, button, escapeHtml } = require("./emailLayout.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");
const { unsubscribeUrl } = require("../utils/unsubscribe.js");

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
// Two kinds of match, each with its own wording:
//   alerts — items the shopper set an alert for (has an alert_id)
//   sizes  — anything new in their saved sizes, from the size-alerts
//            toggle (no alert behind it)
// A shopper gets ONE email per batch. With only one kind it uses that
// kind's wording; with both, one email with a section for each.
//
// Written to read as a personal notification, not a sale flyer, so Gmail
// is less likely to file it under Promotions: a subject about THEIR
// item, compact rows instead of a photo grid, one main button, and a
// plain-text version.
const DIGEST_KINDS = {
  alerts: {
    section: "Your alerts",
    subjectLead: "Your size is back",
    heading: "Your size is back.",
    intro: (n) =>
      n === 1 ? "something you're tracking is available" : `${n} things you're tracking are available`,
    footer: (store) => `You set alerts at ${store}.`,
  },
  sizes: {
    section: "New in your size",
    subjectLead: "In your size now",
    heading: "New in your size.",
    intro: (n) =>
      n === 1 ? "a new arrival just landed in your saved sizes" : `${n} new arrivals just landed in your saved sizes`,
    footer: (store) => `Size alerts are on at ${store}.`,
  },
};

// "Your size is back: Jordan 12 Retro Deep Royal Blue +11 more"
const digestSubject = (lead, items) => {
  const more = items.length > 1 ? ` +${items.length - 1} more` : "";
  return `${lead}: ${items[0].product_name}${more}`;
};

const rowsFor = (items) =>
  items
    .map((item) =>
      itemRow({
        name: item.product_name,
        details: itemDetails(item),
        imageUrl: item.image_url,
        href: item.shopify_url,
      }),
    )
    .join("");

const sectionTitle = (text) =>
  `<p class="ss-muted" style="margin: 24px 0 4px; font-size: 12px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #a1a1a1;">${escapeHtml(text)}</p>`;

const plainText = ({ greetingText, intro, parts, both, ctaHref, footer, unsubscribeHref }) =>
  [
    `${greetingText}, ${intro}`,
    "",
    ...parts.flatMap(([kind, items]) => [
      ...(both ? [DIGEST_KINDS[kind].section.toUpperCase()] : []),
      ...items.map((i) => `- ${i.product_name} (${itemDetails(i)})\n  ${i.shopify_url}`),
      "",
    ]),
    `See your matches: ${ctaHref}`,
    "",
    footer,
    `Unsubscribe from alert emails: ${unsubscribeHref}`,
  ].join("\n");

const sendDigestEmail = async ({ store, account, membershipId, alerts = [], sizes = [] }) => {
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
  const [firstKind] = parts[0];
  const first = DIGEST_KINDS[firstKind];
  const allItems = parts.flatMap(([, items]) => items);

  const introText = both
    ? `${DIGEST_KINDS.alerts.intro(alerts.length)} at ${fromName}, and ${DIGEST_KINDS.sizes.intro(sizes.length)}.`
    : `${first.intro(allItems.length)} at ${fromName}.`;
  const intro = both
    ? `${greeting(account)}, ${DIGEST_KINDS.alerts.intro(alerts.length)} at ${storeHtml}, and ${DIGEST_KINDS.sizes.intro(sizes.length)}.`
    : `${greeting(account)}, ${first.intro(allItems.length)} at ${storeHtml}.`;

  // One main button: straight to the item if there's one, else the dashboard
  const ctaHref = allItems.length === 1
    ? allItems[0].shopify_url
    : `${storeBaseUrl(store)}/store/dashboard`;
  const bodyHtml =
    parts
      .map(([kind, items]) => `${both ? sectionTitle(DIGEST_KINDS[kind].section) : ""}${rowsFor(items)}`)
      .join("") +
    `<div style="margin-top: 24px;">${button(ctaHref, allItems.length === 1 ? "View it" : "See your matches")}</div>`;

  const footerText = `${parts.map(([kind]) => DIGEST_KINDS[kind].footer(fromName)).join(" ")} Manage alerts in your profile.`;
  const footer = `${parts.map(([kind]) => DIGEST_KINDS[kind].footer(storeHtml)).join(" ")} Manage alerts in your profile.`;
  const unsubscribeHref = unsubscribeUrl(membershipId);

  // Resend returns API failures instead of throwing — throw so the
  // digest service can requeue the items
  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    // Lead with the first kind's wording; "+N more" counts every item
    subject: digestSubject(first.subjectLead, allItems),
    html: renderEmail({
      preheader: introText,
      heading: first.heading,
      intro,
      bodyHtml,
      footer,
      unsubscribeHref,
    }),
    text: plainText({
      greetingText: `Hi${account.full_name ? ` ${account.full_name}` : ""}`,
      intro: introText,
      parts,
      both,
      ctaHref,
      footer: footerText,
      unsubscribeHref,
    }),
    // One-click unsubscribe (RFC 8058) — expected by Gmail and Yahoo
    headers: {
      "List-Unsubscribe": `<${unsubscribeHref}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
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

// Sent right after an email/password signup. Merchants get Syncstock
// branding; shoppers get the store they signed up with.
const sendVerificationEmail = async ({ store, account, verifyUrl, merchant = false }) => {
  if (!resend) {
    console.warn("Skipping email - Resend not configured");
    return;
  }
  const fromName = merchant ? "Syncstock" : store?.name || "Syncstock";
  const fromEmail = (!merchant && store?.notification_from_email) || process.env.RESEND_FROM_EMAIL;
  const where = merchant ? "Syncstock" : escapeHtml(fromName);

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    subject: "Verify your email",
    html: renderEmail({
      preheader: "Confirm your email to finish signing up",
      heading: "Verify your email",
      intro: `${greeting(account)}, confirm this is your email to finish setting up your ${where} account. This link expires in 24 hours.`,
      bodyHtml: button(verifyUrl, "Verify email"),
      footer: "If you didn't sign up, you can ignore this email.",
    }),
    text: `Confirm this is your email to finish setting up your ${merchant ? "Syncstock" : fromName} account:
${verifyUrl}

This link expires in 24 hours. If you didn't sign up, you can ignore this email.`,
  });
  if (error) throw new Error(error.message || "Verification email failed");
};

module.exports = {
  sendVerificationEmail,
  sendAlertEmail,
  sendPriceDropEmail,
  sendDigestEmail,
  sendPasswordResetEmail,
};
