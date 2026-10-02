# Shopify App Store submission — SyncStock (public app)

Draft listing copy and reviewer notes for the public app
(`shopify-app/shopify.app.public.toml`). Shopify's character limits are in
brackets; check them in the Partner dashboard form, they change.

## Listing

**App name** [30]: SyncStock: Restock Alerts

**App card subtitle** [62]: Restock alerts in your shoppers' sizes, from your own site

**App introduction** [100]:
Turn sold-out pairs into sales: shoppers set alerts by size and get notified the moment you restock.

**App details** [500]:
SyncStock gives your store a branded alerts site where shoppers save their sizes and the pairs they're hunting. When you list a restock — including from tools like Copyt — SyncStock waits until the drop finishes, then sends each shopper one alert with every match in their size, final photos, and a link straight to checkout. You see which sales came from alerts, which sizes shoppers want most, and get a weekly "most wanted" report. Add a "Never miss a restock" section to your theme in one click.

**Key features** [80 each]:
- Alerts by size, price range, and condition, sent by email, push, and in-app
- Waits for your drop to finish, then sends one message per shopper
- Tracks sales from alerts, including Shop Pay and "Buy it now" checkouts
- Weekly "most wanted sizes" report and a sourcing page
- Theme section and floating button, branded with your logo and colors

**Pricing**: One plan — $40/month, 7-day free trial. Billed through Shopify.

**Search terms**: restock alerts, back in stock, sneakers, notify me, sold out

**Category**: Marketing and conversion → Customer engagement (or "Back in stock")

**Support**: hello@syncstock.io · Privacy policy: https://syncstock.io/privacy · Terms: https://syncstock.io/terms

## Don't claim yet
- Text messages (switched off until Twilio approval — `SMS_ENABLED`)
- StockX price comparison (flagship store only, pending StockX's OK)

## Screenshots to take (1600×900, desktop)
1. Shopper dashboard: "In stock in your sizes" grid with filters
2. Track a shoe: photo, size picker, price range slider
3. Alert email on a phone (one message, several pairs)
4. Merchant dashboard: revenue attributed, funnel, recent purchases
5. Store settings: categories, logo and brand color preview
6. Theme editor showing the "Restock alerts" section on a home page

## Demo screencast (2–3 min, required)
1. Install from Shopify on a development store → SyncStock opens onboarding
2. Create the merchant account, pick a subdomain, start the free trial (approve the charge)
3. Open the store's SyncStock site as a shopper, save sizes, set an alert
4. In Shopify, add stock to that size → show the alert email arriving
5. Click through and check out → show the sale on the merchant dashboard
6. Theme editor → add the "Restock alerts" section

## Testing instructions for reviewers
1. Install SyncStock on your development store. You'll land on SyncStock's onboarding.
2. Create a merchant account with your email, confirm it from the email we send, choose a subdomain, and click **Start free trial** — approve the test charge in Shopify.
3. Your catalog syncs automatically. Open "View storefront" in the sidebar to see the shopper site; sign up as a shopper with a second email, save a size, and tap "Set alert" on any sold-out item (or "Track a new shoe").
4. In Shopify, increase inventory for that item and size. About 90 seconds later the shopper gets one alert email.
5. Theme editor → Add section → Apps → "Restock alerts" to see the storefront block.

Notes for reviewers:
- SyncStock's dashboard runs on syncstock.io (not embedded). Opening the app from the Shopify admin takes you there.
- Alerts wait ~90 seconds after the last product change so a whole drop goes out as one message — this is intentional.

## Before submitting — checklist
- [ ] Billing tested end to end on `syncstock-billing-test`
- [ ] `npx shopify app deploy` run for the public app, Distribution set to Public
- [ ] `SHOPIFY_PUBLIC_APP_CLIENT_ID` / `SHOPIFY_PUBLIC_APP_CLIENT_SECRET` set on Railway
- [ ] App icon (1200×1200) and screenshots uploaded
- [ ] Demo screencast recorded
- [ ] Private beta gate: Shopify installs bypass it (reviewers can install); decide whether to open the manual Connect page too
