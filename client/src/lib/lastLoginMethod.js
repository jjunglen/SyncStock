// Remembers which sign-in method this browser used last ("password" or
// "google") so the login page can label it
const KEY = "syncstock_last_login_method";

export function getLastLoginMethod() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastLoginMethod(method) {
  try {
    localStorage.setItem(KEY, method);
  } catch {
    // Storage blocked (private mode) — the label is just a convenience
  }
}
