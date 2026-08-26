require("dotenv").config();
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendAlertEmail = async ({ store, account, alert, inventory }) => {
  const fromEmail =
    store.notification_from_email || process.env.RESEND_FROM_EMAIL;
  const fromName = store.name;

  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    subject: `${inventory.shoe_name} is back in stock`,
    html: `
      <p>Hi${account.full_name ? ` ${account.full_name}` : ""},</p>
      <p>${inventory.shoe_name} (Size ${inventory.size}) is now available at ${fromName}.</p>
      <p>Price: $${inventory.price}</p>
      <p><a href="${inventory.shopify_url}">View it here</a></p>
    `,
  });
};

const sendPriceDropEmail = async ({ store, account, alert, inventory }) => {
  const fromEmail =
    store.notification_from_email || process.env.RESEND_FROM_EMAIL;
  const fromName = store.name;

  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    subject: `${inventory.shoe_name} price drop`,
    html: `
      <p>Hi${account.full_name ? ` ${account.full_name}` : ""},</p>
      <p>${inventory.shoe_name} (Size ${inventory.size}) dropped to $${inventory.price} at ${fromName}.</p>
      <p><a href="${inventory.shopify_url}">View it here</a></p>
    `,
  });
};

const sendDigestEmail = async ({ store, account, items }) => {
  const fromEmail =
    store.notification_from_email || process.env.RESEND_FROM_EMAIL;
  const fromName = store.name;

  const itemsHtml = items
    .map(
      (item) => `
      <div style="background: #111; border: 1px solid #1e1e1e; border-radius: 10px; padding: 20px; margin-bottom: 16px;">
        ${
          item.image_url
            ? `
        <div style="background: #ffffff; border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center;">
          <img src="${item.image_url}" alt="${item.shoe_name}" style="max-width: 220px; height: auto; object-fit: contain;" />
        </div>
        `
            : ""
        }
        <p style="margin: 0 0 4px; font-weight: bold; font-size: 16px;">${item.shoe_name}</p>
        <p style="margin: 0 0 16px; color: #888; font-size: 14px;">Size ${item.size} — $${item.price}</p>
        <a href="${item.shopify_url}" style="display: inline-block; background: #378ADD; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
          View →
        </a>
      </div>
    `,
    )
    .join("");

  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    subject: `${items.length} new match${items.length > 1 ? "es" : ""} at ${fromName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px; border-radius: 12px;">
        <h1 style="color: #378ADD; font-size: 24px; margin-bottom: 8px;">Your shoes are in.</h1>
        <p style="color: #888; margin-bottom: 24px;">
          Hi${account.full_name ? ` ${account.full_name}` : ""}, ${items.length} item${items.length > 1 ? "s" : ""} matching your alerts just went live at ${fromName}.
        </p>
        ${itemsHtml}
      </div>
    `,
  });
};

const sendPasswordResetEmail = async ({
  store,
  account,
  resetUrl,
  googleOnly,
}) => {
  const fromName = store?.name || "Syncstock";
  const fromEmail =
    store?.notification_from_email || process.env.RESEND_FROM_EMAIL;

  if (googleOnly) {
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: account.email,
      subject: `Password reset requested`,
      html: `
        <p>Hi${account.full_name ? ` ${account.full_name}` : ""},</p>
        <p>Someone requested a password reset for this email, but your account uses Google sign-in and has no password. Just continue signing in with Google.</p>
        <p>If this wasn't you, you can safely ignore this email.</p>
      `,
    });
    return;
  }

  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: account.email,
    subject: `Reset your password`,
    html: `
      <p>Hi${account.full_name ? ` ${account.full_name}` : ""},</p>
      <p>Click below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; background: #2dd4bf; color: #06110f; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset password</a>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
};

module.exports = { sendAlertEmail, sendPriceDropEmail, sendDigestEmail, sendPasswordResetEmail };
