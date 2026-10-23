# SyncStock screencast script (~3½ minutes)

For the Shopify App Store "Screencast URL" — seen only by Shopify's app
reviewers, not shown on the public listing. Upload to YouTube as **Unlisted**.

## Before you hit record

- SyncStock should **not** be installed on the test store (`syncstock-billing-test`), and its SyncStock data should be cleared.
- In the test store, add a product: **Nike Dunk Low Panda** with a photo,
  - option **Size**: `9`, `10`, `11`
  - option **Condition**: `Brand New`
  - set **10** to **0** in stock (the others 1+)
- Second email inbox open in another tab (the shopper).
- Close tabs with real customer data.
- Test payment: Bogus Gateway card `1`, or Shopify Payments test card `4242 4242 4242 4242`.

## Script

**1 · The problem** · 0:00–0:15
*Screen:* a sold-out product page on the test store.
**Say:** "When a pair sells out, most shoppers leave and never come back. SyncStock brings them back the moment their size restocks — and shows you exactly which sales it drove. Here's the full setup."
*Caption:* Sold out shouldn't mean lost sales.

**2 · Install** · 0:15–0:35
*Screen:* Dev Dashboard → Test your app → syncstock-billing-test → approval screen → Install.
**Say:** "SyncStock installs from Shopify. It only needs read access to your products and orders, plus a pixel that tracks sales from alerts. One click to install."
*Caption:* Step 1: Install from Shopify

**3 · Account and store address** · 0:35–1:05
*Screen:* create login → confirm email → pick the subdomain.
**Say:** "You land right in setup. Create your login, confirm your email, then pick the address for your alert site — this is where your shoppers sign up."
*Caption:* Step 2: Create your login and store address

**4 · Free trial** · 1:05–1:20
*Screen:* Start free trial → Shopify charge screen → Approve.
**Say:** "Billing runs through Shopify — a 7-day free trial, then monthly. On a development store it's a test charge."
*Caption:* Step 3: Start your free trial

**5 · Dashboard** · 1:20–1:40
*Screen:* slowly move across the stat cards, then "What to source next" and "Most viewed this week".
**Say:** "Your catalog syncs automatically — any product with sizes works. The dashboard shows sales from alerts, what shoppers are waiting for, and what they're looking at most — so you know what to buy next."
*Caption:* Your catalog syncs automatically

**6 · Add it to your store** · 1:40–2:05
*Screen:* Store settings → Add section → theme editor → place on home page → Save.
**Say:** "To send shoppers to SyncStock, open Store settings and click Add section. Your theme editor opens with the Restock alerts section ready — place it and save. No code."
*Caption:* Step 4: Add Restock alerts to your theme

**7 · The shopper's side** · 2:05–2:35
*Screen:* storefront → Get restock alerts → sign up (second email) → save sizes → Dunk Low Panda, size 10 → Set alert for this size. (Optional: flash the "Track a new item" button.)
**Say:** "Now I'm a shopper. I tap Get restock alerts, save my sizes once, and set an alert on the pair I want — my size is sold out right now. I can even track items the store doesn't carry yet."
*Caption:* Shoppers save their sizes and set alerts

**8 · The restock** · 2:35–2:55
*Screen:* Shopify admin → the product → set size 10 to 1 → Save. **Cut** and resume when the email arrives (~90 s).
**Say:** "Back in Shopify, I restock that size. SyncStock waits a moment so a whole drop goes out as one message…"
*Caption:* Restock in Shopify, as usual

**9 · The alert and checkout** · 2:55–3:15
*Screen:* open the email → click through → checkout → test payment → place order.
**Say:** "…and here's the alert — every match in my size, one tap to checkout. This is Shopify's normal checkout."
*Caption:* One email, straight to checkout

**10 · The payoff** · 3:15–3:30
*Screen:* merchant dashboard → Recent purchases (the sale with its SyncStock label).
**Say:** "And on the dashboard, there's the sale — credited to SyncStock. Every restock becomes a chance to sell. That's SyncStock."
*Caption:* See every sale your alerts drove

## Tips

- Record scene by scene and join the clips in Clipchamp, so a fumble only means redoing one scene.
- Move the mouse slowly and pause about a second after each click.
- Zoom in on small details: the charge screen, the email, the sale's label.
- Don't mention text messages, the price check, or the phone app (not live yet).
- The sale can take a minute to show — refresh the dashboard if it isn't there yet.
- **Afterwards:** leave the test store installed for at least an hour, so the automatic token renewal can be checked.
