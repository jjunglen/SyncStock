// app_subscriptions/update — Shopify tells us a store's subscription
// changed. Only the store's current subscription counts (an old,
// replaced one changing is ignored).
//   ACTIVE                                → live (if setup is finished)
//   CANCELLED, DECLINED, EXPIRED, FROZEN  → offline; the merchant is sent
//                                           back to the plan step to
//                                           subscribe again (FROZEN means
//                                           Shopify couldn't charge them)
// The flagship store (plan "internal") never pays, so this never
// changes it.
const STOPPED = ["CANCELLED", "DECLINED", "EXPIRED", "FROZEN"];

const handleSubscriptionUpdate = async (req, res) => {
  res.status(200).json({ received: true });
  try {
    const store = req.store;
    const subscription = JSON.parse(req.body).app_subscription || {};
    const status = String(subscription.status || "").toUpperCase();

    if (store.plan === "internal") return;
    if (subscription.admin_graphql_api_id !== store.shopify_subscription_id) {
      console.log(`Ignoring update for a replaced subscription at ${store.shopify_domain}`);
      return;
    }

    if (status === "ACTIVE") {
      await store.update({
        billing_status: "active",
        ...(store.onboarding_step === "complete" && !store.uninstalled_at && { status: "active" }),
      });
    } else if (STOPPED.includes(status)) {
      await store.update({
        billing_status: status.toLowerCase(),
        status: "suspended",
        onboarding_step: store.onboarding_step === "complete" ? "plan" : store.onboarding_step,
      });
      console.log(`Subscription ${status} — ${store.shopify_domain} is offline until they subscribe`);
    }
  } catch (error) {
    console.error("Subscription update webhook error:", error.message);
  }
};

module.exports = { handleSubscriptionUpdate };
