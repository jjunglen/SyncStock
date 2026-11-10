import api from "./api.js";

// Only a 401 means "not logged in". Anything else (server busy, network
// blip, a deploy restarting) says nothing about the login.
export const isLoggedOut = (err) => err?.response?.status === 401;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GET /auth/me, retried a couple of times on server or network errors
// so a brief hiccup doesn't look like being logged out
export const fetchMe = async (tries = 3) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await api.get("/auth/me");
    } catch (err) {
      if (isLoggedOut(err) || attempt >= tries) throw err;
      await wait(700 * attempt);
    }
  }
};
