import { useEffect, useState } from "react";
import { fetchMe, isLoggedOut } from "./fetchMe.js";

// Whether a shopper is signed in on this store's site: null while
// checking, then true or false. Asked again each time a page mounts (so
// logging in or out is picked up), starting from the last answer so the
// header doesn't flicker. Checks running at the same time share one
// request.
let lastKnown = null;
let request = null;

const checkSignedIn = () => {
  if (!request) {
    request = fetchMe()
      .then(() => true)
      // Logged out only on a 401; if the server just couldn't answer,
      // keep the last answer
      .catch((err) => (isLoggedOut(err) ? false : (lastKnown ?? false)))
      .then((value) => {
        lastKnown = value;
        request = null;
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
