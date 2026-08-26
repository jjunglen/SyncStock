# Syncstock

Multi-tenant Shopify inventory alert and restock notification platform for sneaker and streetwear resellers. Customers save alerts for the exact shoe, size, and price they're after, and get notified the moment a matching item goes live on a merchant's store.

Built as a standalone SaaS spin-off of [Lab Sync](https://labsync.cc), the single-tenant tool originally built for [The Laboratory DTX](https://thelabdtx.com).

## How it works

1. A merchant connects their Shopify store via OAuth. Syncstock automatically generates a subdomain (`theirstore.syncstock.io`), registers the webhooks it needs, and walks them through picking a plan.
2. Customers browse inventory and set alerts directly on that subdomain, or via a lightweight "notify me" widget embedded on the merchant's own Shopify storefront.
3. When Shopify sends a webhook for a new or updated product, Syncstock checks it against every active alert for that store. Matches get queued and batched into a single digest email — not one email per item — sent out shortly after a burst of new inventory settles.

## Architecture

Syncstock is multi-tenant: one codebase and one database serve every connected store. A few core decisions shape the rest of the schema:

- **`Store`** is the tenant root. Every other table that holds merchant-specific data carries a `store_id`.
- **`Account` vs. `User`** — identity is split from store membership. `Account` is a person's global login (one email, one password, works across every Syncstock-powered store they've connected with). `User` is a lightweight per-store membership record (role, notification preferences) linking an `Account` to a `Store`. This is what lets someone log in once and see alerts across multiple shops, instead of creating a separate account per store.
- **Subdomain resolution** — most customer-facing requests resolve which store they belong to from the subdomain (`tenant.middleware.js`), not from the logged-in account, since an `Account` on its own doesn't imply a specific store.
- **Notification batching** — matches don't email immediately. They queue into `PendingNotification`, then get flushed either by a short debounce (fires once a burst of matches settles) or a fixed cron sweep as a safety net, and sent as one digest email per customer per store.

## Tech stack

**Client** — React 19 (React Compiler enabled), Vite, Tailwind CSS v4, React Router, react-icons

**Server** — Node.js, Express, Sequelize ORM, PostgreSQL (Supabase), Passport (Google OAuth), JWT + httpOnly cookies for sessions, Resend (email), node-cron

## Project structure

```
syncstock/
├── client/          React + Vite frontend
├── server/          Express API
│   └── src/
│       ├── config/       Database, Passport
│       ├── models/       Sequelize models
│       ├── middleware/   Auth, tenant resolution, Shopify webhook verification
│       ├── controllers/  Route handlers
│       ├── routes/       Express route definitions
│       ├── services/     Alert matching, notifications, digest batching, email
│       └── utils/        Shared helpers (pagination, validation, JWT)
└── docs/            Internal notes (e.g. PORTING.md)
```

## Getting started

### Server

```bash
cd server
cp .env-example .env   # fill in your own values
npm install
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

### Environment variables

See `server/.env-example` for the full list. At minimum, the server needs:

- `DATABASE_URL` — Postgres connection string (Supabase or otherwise)
- `JWT_SECRET` — random string, used to sign session tokens
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` — for Google sign-in
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — for outgoing email
- `SHOPIFY_APP_CLIENT_ID` / `SHOPIFY_APP_CLIENT_SECRET` / `SHOPIFY_APP_SCOPES` — for the Shopify OAuth app
- `FRONTEND_URL` / `BACKEND_URL` — used to build redirect and callback links

## License

See [LICENSE](./LICENSE).
