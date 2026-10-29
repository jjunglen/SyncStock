# SyncStock — Shopify App Store resubmission

What to paste into the Partner Dashboard, and what to do before pressing
Submit. Never put passwords in this file — they go only into the Partner
Dashboard's testing instructions field.

## 1. Before submitting (checklist)

- [ ] **Category: Sales channels** (the review asked for this — 4.5.1).
- [ ] **App name: "SyncStock: Restock Alerts"** ("SyncStock" alone is
      taken on the App Store). Already set in `shopify.app.public.toml`;
      use exactly the same name on the listing.
- [ ] **Navigation icon (5.7.18):** upload `assets/syncstock-nav-icon.svg`
      (16×16) where the Dev Dashboard asks for the sales channel's
      navigation icon. Swap for a single-colour SyncStock mark later if
      you like.
- [ ] **read_only_own_orders (5.7.1):** Shopify adds this during review. In
      the submission notes, say SyncStock is ready for the
      `read_only_own_orders` flag (text below).
- [ ] **Shopper test login (4.5.4 / 4.5.5):** on the test store's shopper
      site, create a shopper account with an email + password (no Google,
      no 2FA), save a size or two, set one alert. Put the email and
      password only in the Partner Dashboard field below. Keep it working
      after approval — reviewers re-check.
- [ ] **Screencast (recommended by the review checklist):** a 3–5 minute
      English recording of section 3's steps, from install to checkout.
- [ ] The latest public app version is deployed (`shopify app deploy
      --config shopify.app.public.toml`) and Railway has
      `SHOPIFY_PUBLIC_EMBEDDED=true`.

## 2. Submission notes (paste as is)

> SyncStock is now a sales channel, as requested in the previous review
> (4.5.1). Each store gets its own SyncStock site ({store}.syncstock.io),
> where shoppers browse the products the merchant publishes to the
> SyncStock channel, filtered to their sizes, and get restock and new-arrival
> alerts. Every purchase goes through the merchant's Shopify checkout (cart
> permalinks carrying our storefront access token, so orders are attributed
> to the channel).
>
> The app is embedded in the Shopify admin (App Bridge, session tokens,
> Polaris web components). After install, merchants land on the channel
> page's account section, where they can connect or disconnect; the
> publishing section shows the published product count, links to manage
> products, and product issues (also sent as product resource feedback).
> No separate SyncStock login is needed in the admin.
>
> We're ready for the read_only_own_orders scope (5.7.1). Automatic
> publishing (publishing new products to SyncStock as they go live) is
> off by default; read_publications / write_publications are requested only
> when a merchant turns it on.

## 3. Testing instructions (paste into the Partner Dashboard)

> **Install and setup (about 3 minutes)**
> 1. Install SyncStock on your development store and approve the
>    permissions. SyncStock opens inside the Shopify admin on its channel
>    page — Shopify signs you in; there's no separate SyncStock login.
> 2. Click **Create account** and finish setup: your name, any email and
>    password (this is the store's SyncStock account), a shopper site
>    address, and the plan. On a development store the plan is a test
>    charge — approve it; nothing is billed.
> 3. You're back on the channel page: the **Account** section shows
>    SyncStock as Connected, with **Disconnect** (and **Connect** to undo).
>
> **Publishing**
> 4. In **Products**, select a few products with photos and stock → **More
>    actions → Include in sales channels → SyncStock**. The channel page's
>    **Publishing** section shows the new count.
> 5. Publish a product without a photo: the channel page lists it, and the
>    product shows SyncStock feedback ("Add a product photo") in Products.
> 6. Optional: **Automatic publishing → Match my Online Store** (Shopify
>    asks for the publishing permission) publishes everything live on the
>    Online Store.
>
> **Shopper site**
> 7. Click **View your SyncStock site**. Published, in-stock products with a
>    photo are listed; unpublished ones aren't.
> 8. Sign up as a shopper (or use our demo shopper login below on our demo
>    store), save a size, and set an alert on a product.
> 9. **Buy now** opens the store's Shopify cart; the order is attributed to
>    SyncStock in Shopify's sales by channel.
> 10. Restock alert: set a published variant's stock to 0, then back to 1 —
>     the shopper gets an email alert.
>
> **Demo store (already set up)**
> - Shopper site: https://test.syncstock.io (store: syncstock-billing-test.myshopify.com)
> - Shopper login: {SHOPPER EMAIL} / {SHOPPER PASSWORD}
> - Support: support@syncstock.io
