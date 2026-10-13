const jwt = require("jsonwebtoken");
const { DeviceToken } = require("../models/index.js");

// Notifications to the SyncStock phone app, through Firebase Cloud
// Messaging (HTTP v1 API). Needs FIREBASE_SERVICE_ACCOUNT on the server:
// the service account JSON from Firebase (Project settings → Service
// accounts), either as-is or base64-encoded. Without it nothing is sent.
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const serviceAccount = () => {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    return parsed.client_email && parsed.private_key && parsed.project_id ? parsed : null;
  } catch {
    return null;
  }
};

const isAppPushConfigured = () => !!serviceAccount();

// Google access token for FCM, reused until a few minutes before expiry
let cachedAccess = null;
const accessToken = async (account) => {
  if (cachedAccess && cachedAccess.expiresAt - Date.now() > 5 * 60 * 1000) {
    return cachedAccess.token;
  }
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: account.client_email, scope: FCM_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 },
    account.private_key,
    { algorithm: "RS256" },
  );
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || !body.access_token) {
    throw new Error(`FCM sign-in failed (${resp.status})`);
  }
  cachedAccess = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in || 3600) * 1000,
  };
  return cachedAccess.token;
};

// FCM's answer for a token that will never work again (app deleted,
// token replaced) — those rows are removed
const isDeadToken = (status, body) => {
  const code = body?.error?.details?.find((d) => d.errorCode)?.errorCode;
  return status === 404 || code === "UNREGISTERED" || (status === 400 && code === "INVALID_ARGUMENT");
};

// Sends to every phone signed in to this account.
// payload: { title, body, url, image? } — `url` is the store page the
// app opens when the notification is tapped.
const sendAppNotification = async (accountId, payload) => {
  const account = serviceAccount();
  if (!account) return;
  try {
    const devices = await DeviceToken.findAll({ where: { account_id: accountId } });
    if (devices.length === 0) return;
    const token = await accessToken(account);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;

    await Promise.all(
      devices.map(async (device) => {
        try {
          const resp = await fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                token: device.token,
                notification: {
                  title: payload.title,
                  body: payload.body,
                  ...(payload.image && /^https:\/\//.test(payload.image) && { image: payload.image }),
                },
                data: { url: payload.url || "" },
                apns: { payload: { aps: { sound: "default" } } },
              },
            }),
          });
          if (resp.ok) return;
          const body = await resp.json().catch(() => ({}));
          if (isDeadToken(resp.status, body)) await device.destroy();
          else console.error(`App push failed (${resp.status}):`, body?.error?.message || "");
        } catch (err) {
          console.error("App push send error:", err.message);
        }
      }),
    );
  } catch (error) {
    console.error("Send app notification error:", error.message);
  }
};

module.exports = { sendAppNotification, isAppPushConfigured };
