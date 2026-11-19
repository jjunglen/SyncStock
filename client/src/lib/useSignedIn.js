import { useEffect, useState } from "react";
import { fetchMe, isLoggedOut } from "./fetchMe.js";

// Whether a shopper is signed in on this store's site: null while
// checking, then true or false. Asked again each time a page mounts (so
// logging in or out is picked up), starting from the last answer so the
// header doesn't flicker. Checks running at the same time share one
// request.
let lastKnown = null;
let request = null;
// Merchants signed in on a store's site (checking their own shopper
// pages) aren't sent to the shopper dashboard
let merchant = false;

// Remembered between visits: a shopper who was signed in last time is
// probably still signed in, so the home page waits for the answer
// instead of flashing the sign-up pitch (StoreLanding.jsx)
const HINT_KEY = "syncstock_shopper_signed_in";
export const signedInHint = () => {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};
const saveHint = (value) => {
  try {
    if (value) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch {
    // Storage blocked: no head start, nothing else changes
  }
};

export const isMerchantSession = () => merchant;

const checkSignedIn = () => {
  if (!request) {
    request = fetchMe()
      .then((res) => {
        merchant = !!res?.data?.data?.is_merchant;
        return true;
      })
      // Logged out only on a 401; if the server just couldn't answer,
      // keep the last answer
      .catch((err) => (isLoggedOut(err) ? false : (lastKnown ?? false)))
      .then((value) => {
        lastKnown = value;
        request = null;
        saveHint(value && !merchant);
        return value;
      });
  }
  return request;
};

export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(lastKnown);
  useEffect(() => {
    let active = true;
    checkSignedIn().then((value) => active && setSignedIn(value));
    return () => {
      active = false;
    };
  }, []);
  return signedIn;
}
