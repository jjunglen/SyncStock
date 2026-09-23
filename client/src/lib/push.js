import api from "./api.js";

// Converts the VAPID public key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return "not-subscribed";

  const existing = await registration.pushManager.getSubscription();
  return existing ? "subscribed" : "not-subscribed";
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error("Push notifications aren't supported in this browser");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("VITE_VAPID_PUBLIC_KEY is not set");
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const raw = subscription.toJSON();
  await api.post("/push/subscribe", {
    endpoint: raw.endpoint,
    keys: raw.keys,
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await api.delete("/push/subscribe", {
    data: { endpoint: subscription.endpoint },
  });
  await subscription.unsubscribe();
}
