import { getSubdomain } from "./getSubdomain.js";
import { getStoreInfo } from "./storeInfo.js";

// Sets a page's title, description, canonical address and whether search
// engines may index it (components/Seo.jsx, and store product pages
// once their product loads)

export const DEFAULT_DESCRIPTION =
  "Restock alerts for sneaker, streetwear and trading card stores on Shopify. Shoppers get notified the moment their size is back, and you see exactly what to restock next.";

const setMeta = (attr, key, content) => {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const setCanonical = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
};

export const applyPageMeta = ({ title, description, canonical, index }) => {
  if (!description) description = DEFAULT_DESCRIPTION;
  document.title = title;
  setMeta("name", "description", description);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  if (canonical) setMeta("property", "og:url", canonical);
  setMeta("name", "robots", index ? "index, follow" : "noindex, follow");
  setCanonical(canonical);
  // A store that turned search engines off (Store settings): its pages
  // are never indexed
  if (index && getSubdomain()) {
    getStoreInfo()
      .then((info) => {
        if (info?.search_indexing === false && document.title === title) {
          setMeta("name", "robots", "noindex, follow");
        }
      })
      .catch(() => {});
  }
};

