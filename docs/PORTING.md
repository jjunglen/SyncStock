# Porting plan: Lab Sync → Syncstock

Reference: jjunglen/Laboratory-App

## Keep as-is (store-agnostic already)

- `controllers/notification.controller.js`, `push.controller.js`
- `services/alert.service.js` — core matching logic
- `middleware/shopify.middleware.js` — HMAC webhook verification, fully generic
- `models/Alert.js`, `NotificationLog.js`, `PushSubscription.js`, `AlertClick.js`
  (add `store_id` FK, otherwise unchanged)

## Keep, but scope to store_id

- `controllers/auth.controller.js`, `google.auth.controller.js`
- `config/passport.js`, `middleware/auth.middleware.js`
- `models/User.js` — add `store_id` FK
- `client/src/context/AuthContext.jsx`, `pages/Auth.jsx`, `VerifyEmail.jsx`

## Needs rewriting (hardcoded store identity)

- `webhook.controller.js` — hardcoded `https://thelabdtx.com/products/${handle}`
  → pull store domain from `stores` table via `req.store` (see tenant middleware)
- `services/email.service.js` — "The Laboratory DTX" baked into 5+ email strings
  → templatize with `store.name` / `store.branding`
- `services/notification.service.js` — same hardcoded store name in message text
- `scripts/backfillImages.js` — hardcoded `STORE_URL`
- `scripts/registerWebhooks.js` — hardcoded Railway backend URL, single-store
  webhook registration → needs to loop per store or run per-store on connect

## Evaluate case-by-case

- `controllers/stockx.controller.js` — built for one store's StockX account;
  decide if Syncstock v1 even offers StockX integration
- `controllers/redirect.controller.js` — check if UTM logic is generic
- `seeders/seed.js` — don't port, write fresh generic seed data
- `Admin.jsx` — built around Laboratory's specific revenue-share view,
  needs rework into a generic per-merchant dashboard