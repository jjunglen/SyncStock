const { User, Account } = require("../models/index.js");
const { sendStoreEmail } = require("./email.service.js");
const { renderEmail, itemRow, button, escapeHtml } = require("./emailLayout.js");
const { storeBaseUrl } = require("../utils/storeUrl.js");
const { logoUrl, textOnColor } = require("../utils/storeSettings.js");
const { payoutFor } = require("./sellRequest.service.js");

// Emails for "Sell your items" (beta). Never throw: a failed email is
// logged and the request carries on.

const money = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const CONDITION = { new: "brand new", used: "pre-owned" };
const brand = (store) => ({
  color: store.brand_color || null,
  text: store.brand_color ? textOnColor(store.brand_color) : null,
});
const shopperLink = (store) => `${storeBaseUrl(store)}/store/sell?tab=requests`;
const merchantLink = () => `${process.env.FRONTEND_URL || "http://localhost:5173"}/buy-requests`;
const pairs = (n) => `${n} pair${n === 1 ? "" : "s"}`;

const safely = async (label, fn) => {
  try {
    await fn();
  } catch (error) {
    console.error(`Sell email (${label}) failed:`, error.message);
  }
};

const adminEmails = async (store) => {
  const admins = await User.findAll({
    where: { store_id: store.id, role: "admin" },
    include: [{ model: Account, attributes: ["email"] }],
  });
  return [...new Set(admins.map((a) => a.Account?.email).filter(Boolean))];
};

const itemDetails = (item) =>
  [`Size ${item.size}`, CONDITION[item.condition], item.box === "original" ? null : item.box === "none" ? "no box" : "damaged box"]
    .filter(Boolean)
    .join(" · ");

// To the store: a shopper sent a batch
const newRequest = (store, request) =>
  safely("new request", async () => {
    const to = await adminEmails(store);
    if (!to.length) return;
    const n = request.items.length;
    await sendStoreEmail({
      fromName: "SyncStock",
      to,
      subject: `New sell request: ${pairs(n)}`,
      html: renderEmail({
        preheader: `A shopper wants to sell you ${pairs(n)}`,
        heading: "A shopper wants to sell you pairs.",
        intro: `${pairs(n)} came in at ${escapeHtml(store.name)}, with suggested offers from your sales history.`,
        bodyHtml:
          request.items.map((i) => itemRow({ name: i.product_name, details: itemDetails(i), imageUrl: i.image_url, href: merchantLink() })).join("") +
          `<p style="margin: 20px 0 0;">${button(merchantLink(), "Review and send an offer")}</p>`,
        footer: "You're getting this because Sell your items is on in your store settings.",
      }),
      text: `${pairs(n)} came in. Review them: ${merchantLink()}`,
    });
  });

// To the shopper: the store's offer
const offerSent = (store, account, request) =>
  safely("offer", async () => {
    const offered = request.items.filter((i) => !i.offer_skipped && i.offer_price !== null);
    const total = offered.reduce((sum, i) => sum + payoutFor(i.offer_price, request), 0);
    const kind = request.payout_method === "credit" ? "store credit" : "cash";
    await sendStoreEmail({
      fromName: store.name,
      to: account.email,
      subject: `${store.name} made you an offer: ${money(total)} ${kind}`,
      html: renderEmail({
        preheader: `${money(total)} ${kind} for ${pairs(offered.length)}`,
        heading: `You have an offer: ${money(total)} ${kind}.`,
        intro: `${escapeHtml(store.name)} reviewed your pairs.${request.merchant_message ? ` Their note: “${escapeHtml(request.merchant_message)}”` : ""}`,
        bodyHtml:
          request.items
            .map((i) =>
              itemRow({
                name: i.product_name,
                details: `${itemDetails(i)} — ${i.offer_skipped || i.offer_price === null ? "not buying this one" : `${money(payoutFor(i.offer_price, request))} ${kind}`}`,
                imageUrl: i.image_url,
                href: shopperLink(store),
              }),
            )
            .join("") + `<p style="margin: 20px 0 0;">${button(shopperLink(store), "Accept or decline", brand(store))}</p>`,
        footer: "Nothing is final until you accept and drop the pairs off at the store.",
        logoUrl: logoUrl(store),
      }),
      text: `${store.name} offered ${money(total)} ${kind}. Accept or decline: ${shopperLink(store)}`,
    });
  });

// To the shopper: the store passed on the whole batch
const storeDeclined = (store, account, request) =>
  safely("store declined", async () => {
    await sendStoreEmail({
      fromName: store.name,
      to: account.email,
      subject: `${store.name} isn't buying these pairs right now`,
      html: renderEmail({
        preheader: "Your sell request was declined",
        heading: "Not this time.",
        intro: `${escapeHtml(store.name)} isn't buying the ${pairs(request.items.length)} you sent right now.${request.merchant_message ? ` Their note: “${escapeHtml(request.merchant_message)}”` : ""}`,
        bodyHtml: `<p>${button(shopperLink(store), "See your requests", brand(store))}</p>`,
        footer: "Your photos have been deleted.",
        logoUrl: logoUrl(store),
      }),
      text: `${store.name} isn't buying these pairs right now.`,
    });
  });

// To the store: the shopper answered the offer
const shopperAnswered = (store, request) =>
  safely("answer", async () => {
    const to = await adminEmails(store);
    if (!to.length) return;
    const accepted = request.items.filter((i) => i.decision === "accepted");
    const subject = accepted.length
      ? `Offer accepted: ${pairs(accepted.length)} coming in`
      : "Offer declined";
    await sendStoreEmail({
      fromName: "SyncStock",
      to,
      subject,
      html: renderEmail({
        preheader: subject,
        heading: accepted.length ? "Your offer was accepted." : "Your offer was declined.",
        intro: accepted.length
          ? `The shopper is bringing in ${pairs(accepted.length)}. Mark them received when they arrive.`
          : "The shopper declined your offer. Their photos have been deleted.",
        bodyHtml:
          accepted.map((i) => itemRow({ name: i.product_name, details: itemDetails(i), imageUrl: i.image_url, href: merchantLink() })).join("") +
          `<p style="margin: 20px 0 0;">${button(merchantLink(), "Open buy requests")}</p>`,
        footer: "You're getting this because Sell your items is on in your store settings.",
      }),
      text: `${subject}. ${merchantLink()}`,
    });
  });

module.exports = { newRequest, offerSent, storeDeclined, shopperAnswered, adminEmails };
