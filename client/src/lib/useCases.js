// The "Built for" pages (/for/…): one page per kind of store, each aimed
// at what that store would search for. Linked from the home page and
// the footer, listed in public/sitemap.xml, and titled in
// components/Seo.jsx. Keep every claim to what SyncStock does today.

export const USE_CASES = [
  {
    path: "/for/sneaker-stores",
    navLabel: "Sneaker stores",
    demo: "sneakers", // components/marketing/MockAlertDemo.jsx
    title: "Restock Alerts for Sneaker Stores on Shopify — SyncStock",
    description:
      "Size-matched restock alerts for Shopify sneaker stores. Shoppers save their shoe size and get notified the moment a pair in that size is back, and you see which sizes to source next.",
    eyebrow: "For sneaker stores",
    h1: "Restock alerts for sneaker stores",
    intro:
      "Sizes sell out one at a time. SyncStock lets shoppers save their shoe size and alerts them the moment a pair in that size lands in your Shopify store, so a 10.5 restock reaches the people who wear a 10.5.",
    points: [
      {
        title: "Alerts by shoe size",
        text: "Men's, women's and grade-school sizes are matched for you, so a women's 11.5 alert fires for a men's 10. Shoppers only hear about pairs they can wear.",
      },
      {
        title: "Brand new or pre-owned",
        text: "Shoppers choose brand new, pre-owned or either, and set a price range. Alerts respect both.",
      },
      {
        title: "Works with how you list",
        text: "SyncStock reads sizes and conditions from your Shopify size options, variant titles and tags, including listings made with tools like Copyt.",
      },
      {
        title: "Know what to source next",
        text: "Your dashboard ranks the pairs and sizes the most shoppers are waiting on, so you buy what will sell before it hits the shelf.",
      },
    ],
    steps: [
      "Install SyncStock on Shopify. Your whole catalog syncs in minutes.",
      "Share your shopper site. Shoppers save their sizes and track the pairs they want.",
      "Restock as usual. Waiting shoppers get an email or push alert with a link straight to the pair.",
    ],
    faq: [
      {
        q: "Do I have to change how I list sneakers?",
        a: "No. SyncStock reads the size from your Shopify size option or variant title, and the condition from your options, tags, title or description.",
      },
      {
        q: "Does it handle women's and kids' sizes?",
        a: "Yes. Women's sizes are matched to their men's equivalent, and grade-school shoes are offered in youth sizes only.",
      },
      {
        q: "How do I know the alerts make money?",
        a: "Your dashboard shows revenue from shoppers who bought after an alert, how many were notified and clicked, and recent purchases.",
      },
    ],
  },
  {
    path: "/for/streetwear-stores",
    navLabel: "Streetwear stores",
    demo: "clothing",
    title: "Back-in-Stock Alerts for Streetwear Stores on Shopify — SyncStock",
    description:
      "Back-in-stock alerts for Shopify streetwear and clothing stores. Shoppers save their sizes, track hoodies, tees and outerwear, and get notified the moment their size is back.",
    eyebrow: "For streetwear stores",
    h1: "Back-in-stock alerts for streetwear stores",
    intro:
      "A hoodie sells out in medium and sits in XXL. SyncStock alerts the shoppers who wear the size that just came back, and shows you which sizes your customers keep asking for.",
    points: [
      {
        title: "Letter sizes, done right",
        text: "S, M, L, XL, one size and long forms like \"X-Large\" are read from your Shopify options, so alerts match the size shoppers actually saved.",
      },
      {
        title: "Price-drop alerts",
        text: "When a tracked piece gets cheaper, the shoppers waiting on it hear about it.",
      },
      {
        title: "Browse by brand and price",
        text: "Shoppers see what's in stock in their sizes, filter by brand and price, and track anything that's sold out.",
      },
      {
        title: "Your store, your brand",
        text: "Your shopper site uses your logo and colors, and checkout happens on your own Shopify store.",
      },
    ],
    steps: [
      "Install SyncStock on Shopify. Clothing sorts itself from your product types.",
      "Shoppers save their sizes and track the pieces they want.",
      "When a size comes back, they get an email or push alert with a link straight to it.",
    ],
    faq: [
      {
        q: "Can I sell sneakers and clothing in the same store?",
        a: "Yes. Products sort into sneakers and clothing from your Shopify product types, and shoppers only see the categories you carry.",
      },
      {
        q: "What about items that aren't clothing or shoes?",
        a: "They go in a category you can rename, like \"Accessories\", with sizes read from your Shopify options.",
      },
      {
        q: "How do shoppers get notified?",
        a: "By email, push notification and their in-app inbox, whichever they turn on. Text alerts are coming soon.",
      },
    ],
  },
  {
    path: "/for/trading-card-shops",
    navLabel: "Trading card shops",
    demo: "cards",
    title: "Restock Alerts for Trading Card Shops on Shopify — SyncStock",
    description:
      "Restock alerts for Shopify trading card shops. Collectors set raw condition, grading company and lowest grade, or factory-sealed only, and get notified when a card that meets their standard is back.",
    eyebrow: "For trading card shops",
    h1: "Restock alerts for trading card shops",
    intro:
      "Collectors don't want any copy of a card — they want a PSA 10, or a Near Mint raw, or a factory-sealed box. SyncStock alerts them only when what comes back meets their standard.",
    points: [
      {
        title: "Raw conditions",
        text: "Collectors pick the worst condition they'll take: Near Mint only, Lightly Played or better, or Moderately Played or better.",
      },
      {
        title: "Graded slabs, per company",
        text: "PSA, CGC, Beckett or other graders, each with its own lowest grade. Beckett Black Label counts above a 10.",
      },
      {
        title: "Sealed product",
        text: "Elite Trainer Boxes, booster boxes and packs, with a choice of factory sealed only or damaged boxes too.",
      },
      {
        title: "Read from your listings",
        text: "SyncStock reads grades, cert numbers and conditions from your Shopify titles, options and tags, so there's nothing extra to enter.",
      },
    ],
    steps: [
      "Install SyncStock on Shopify and turn on Trading cards in Store settings.",
      "Collectors save their card preferences once: raw, graded or sealed, and how good.",
      "When a matching card or box lists, they get an alert with a link straight to it.",
    ],
    faq: [
      {
        q: "Will a collector who wants a PSA 10 get alerts for a PSA 9?",
        a: "No. Each grading company has its own lowest grade, and only cards at or above it send an alert.",
      },
      {
        q: "Can collectors sell cards to my shop?",
        a: "Yes, with Sell your items (beta): collectors send raw, graded or sealed cards with photos and cert numbers, and you send one offer for the batch.",
      },
      {
        q: "Do I need to retag my inventory?",
        a: "Usually not. Titles like \"Charizard ex PSA 10\" or a Condition option of \"Near Mint\" are read as they are.",
      },
    ],
  },
];

export const useCaseFor = (path) => USE_CASES.find((p) => p.path === path) || null;
