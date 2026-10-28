// The "Remember me" choice on this device (components/auth/RememberMe.jsx)
const KEY = "syncstock_remember_me";

export const savedRememberMe = () => {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
};

export const saveRememberMe = (value) => {
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // private browsing: the box just starts ticked next time
  }
};
