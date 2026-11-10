import { useEffect, useState } from "react";
import api from "./api.js";

// Whether a shopper is signed in on this store's site: null while
// checking, then true or false. Asked once per page load and shared.
let request = null;

const checkSignedIn = () => {
  if (!request) {
    request = api
      .get("/auth/me")
      .then(() => true)
      .catch(() => false);
  }
  return request;
};

export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(null);
  useEffect(() => {
    let active = true;
    checkSignedIn().then((value) => active && setSignedIn(value));
    return () => {
      active = false;
    };
  }, []);
  return signedIn;
}
