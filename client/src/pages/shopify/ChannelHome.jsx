import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api.js";
import { openInWholeWindow, shopifyIdToken, startShopifyInstall } from "../../lib/shopifyAdmin.js";

// The SyncStock sales channel's home in the Shopify admin (the first page
// after install — App Store 5.7.10). Built with Shopify's Polaris web
// components (<s-…>, loaded in shopify.html), as channels must be:
//   - status banner (setup, permissions, billing, live) — 5.7.15
//   - Account: the connected SyncStock account, Connect / Disconnect,
//     always shown — 5.7.12, 5.7.13, 5.7.17
//   - Publishing: published product count, link to manage them in Shopify,
//     products SyncStock can't show — 5.7.4, 5.7.9, 5.7.11
//   - the shopper site link (where published products appear) — 5.7.5
//   - help footer
// Server side: server/src/controllers/channel.controller.js.

const SUPPORT_EMAIL = "support@syncstock.io";

export default function ChannelHome() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(""); // "connect" | "disconnect" | ""
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const load = useCallback(() => {
    return api
      .get("/store/channel")
      .then((res) => {
        setData(res.data.data);
        setError("");
      })
      .catch((err) => {
        // Open before SyncStock was approved on this shop: install first
        if (err.response?.data?.code === "SHOPIFY_NOT_INSTALLED" && startShopifyInstall()) return;
        setError(err.response?.data?.message || "Couldn't load SyncStock. Try again.");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (kind) => {
    setBusy(kind);
    setError("");
    try {
      await api.post(`/store/channel/${kind}`);
      setConfirmDisconnect(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setBusy("");
    }
  };

  // A permission the channel needs isn't granted yet: Shopify's approval
  // screen, in the whole window
  const reviewPermissions = async () => {
    const token = await shopifyIdToken();
    if (!token) return;
    openInWholeWindow(`${api.defaults.baseURL}/store/shopify/reauthorize?id_token=${encodeURIComponent(token)}`);
  };

  const connected = !!data?.connection;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f1f1", color: "#303030" }}>
      <s-page heading="SyncStock">
        {error && (
          <s-banner tone="critical" heading="Something went wrong">
            {error}
          </s-banner>
        )}

        {!data && !error && (
          <s-section>
            <s-spinner accessibilityLabel="Loading SyncStock" />
          </s-section>
        )}

        {data && <StatusBanner data={data} onSetup={() => navigate("/onboarding/setup")} onPermissions={reviewPermissions} />}

        {data && (
          <s-section heading="Account">
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text type="strong">SyncStock</s-text>
                <s-badge tone={connected ? "success" : "neutral"}>{connected ? "Connected" : "Not connected"}</s-badge>
              </s-stack>
              {data.setup_complete ? (
                <s-paragraph>
                  {connected ? data.connection.account_name : `${data.store_name} — not connected`}
                  {data.account_email && (
                    <>
                      <br />
                      <s-text color="subdued">Account: {data.account_email}</s-text>
                    </>
                  )}
                </s-paragraph>
              ) : (
                <s-paragraph>
                  Create your SyncStock account to connect. It takes a few minutes: your account, your
                  shopper site address, and your plan.
                </s-paragraph>
              )}

              {!data.setup_complete && (
                <s-button variant="primary" onClick={() => navigate("/onboarding/setup")}>
                  {data.setup_step === "account" ? "Create account" : "Continue setup"}
                </s-button>
              )}

              {data.setup_complete && !data.needs_permission && !connected && (
                <s-button variant="primary" loading={busy === "connect" || undefined} onClick={() => act("connect")}>
                  Connect
                </s-button>
              )}

              {connected && !confirmDisconnect && (
                <s-button tone="critical" onClick={() => setConfirmDisconnect(true)}>
                  Disconnect
                </s-button>
              )}
              {connected && confirmDisconnect && (
                <s-stack direction="block" gap="small-200">
                  <s-paragraph>
                    Disconnect SyncStock? Products stop being published to SyncStock. Your account,
                    shopper site and settings stay, and you can connect again any time.
                  </s-paragraph>
                  <s-stack direction="inline" gap="small-200">
                    <s-button tone="critical" variant="primary" loading={busy === "disconnect" || undefined} onClick={() => act("disconnect")}>
                      Disconnect
                    </s-button>
                    <s-button onClick={() => setConfirmDisconnect(false)}>Cancel</s-button>
                  </s-stack>
                </s-stack>
              )}
            </s-stack>
          </s-section>
        )}

        {data?.publishing && <Publishing publishing={data.publishing} />}

        {data?.setup_complete && (
          <s-section heading="Your SyncStock site">
            <s-stack direction="block" gap="base">
              <s-paragraph>
                Published products appear on your SyncStock site, where shoppers browse in their size, get
                restock alerts, and check out on your store.
              </s-paragraph>
              <s-stack direction="inline" gap="small-200">
                <s-button href={data.shopper_url} target="_blank">
                  View your SyncStock site
                </s-button>
                <s-button variant="tertiary" onClick={() => navigate("/dashboard")}>
                  Open SyncStock dashboard
                </s-button>
              </s-stack>
            </s-stack>
          </s-section>
        )}

        <s-section>
          <s-paragraph>
            <s-text color="subdued">
              Need help? Email <s-link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</s-link> — we usually reply
              within a day.
            </s-text>
          </s-paragraph>
        </s-section>
      </s-page>
    </div>
  );
}

// One banner for where the store stands (5.7.15)
function StatusBanner({ data, onSetup, onPermissions }) {
  if (data.needs_permission) {
    return (
      <s-banner tone="warning" heading="Approve SyncStock's channel permission">
        SyncStock needs permission to see which products you publish to it.
        <s-button slot="secondary-actions" onClick={onPermissions}>
          Review permission
        </s-button>
      </s-banner>
    );
  }
  if (!data.setup_complete) {
    return (
      <s-banner tone="info" heading="Finish setting up SyncStock">
        Your SyncStock channel goes live once setup is done.
        <s-button slot="secondary-actions" onClick={onSetup}>
          Continue setup
        </s-button>
      </s-banner>
    );
  }
  if (data.billing_status === "pending" || data.status !== "active") {
    return (
      <s-banner tone="warning" heading="SyncStock isn't live yet">
        Approve your SyncStock plan in Shopify to put your SyncStock site live.
        <s-button slot="secondary-actions" onClick={onSetup}>
          Review plan
        </s-button>
      </s-banner>
    );
  }
  if (!data.connection) {
    return (
      <s-banner tone="warning" heading="SyncStock is disconnected">
        Connect SyncStock to publish products to your SyncStock site.
      </s-banner>
    );
  }
  return (
    <s-banner tone="success" heading="SyncStock is live">
      Shoppers can browse your published products and get restock alerts.
    </s-banner>
  );
}

// Publishing section (5.7.4, 5.7.9, 5.7.11)
function Publishing({ publishing }) {
  const { published_count, total_count, no_photo, products_filter } = publishing;
  const productsLink = `shopify://admin/products?query=${encodeURIComponent(products_filter)}`;
  return (
    <s-section heading="Publishing">
      <s-stack direction="block" gap="base">
        <s-paragraph>
          <s-text type="strong">{published_count.toLocaleString()}</s-text> of {total_count.toLocaleString()} products
          are published to SyncStock.
        </s-paragraph>
        <s-stack direction="inline" gap="small-200">
          <s-button href={productsLink}>Manage published products</s-button>
          <s-button variant="tertiary" href="shopify://admin/products">
            Publish more products
          </s-button>
        </s-stack>
        <s-paragraph>
          <s-text color="subdued">
            To publish, select products in Products, choose Include in sales channels, and pick SyncStock. Shoppers
            see published products that are in stock and have a photo.
          </s-text>
        </s-paragraph>
        {no_photo.length > 0 && (
          <s-banner tone="warning" heading={`${no_photo.length} published ${no_photo.length === 1 ? "product has" : "products have"} no photo`}>
            SyncStock can't show these until they have a photo:
            <s-unordered-list>
              {no_photo.slice(0, 10).map((p) => (
                <s-list-item key={p.id}>
                  <s-link href={`shopify://admin/products/${p.id}`}>{p.title}</s-link>
                </s-list-item>
              ))}
            </s-unordered-list>
          </s-banner>
        )}
      </s-stack>
    </s-section>
  );
}
