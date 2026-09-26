const jwt = require("jsonwebtoken");

// Signed, login-free link that turns off email alerts for one shopper at
// one store (their User membership). No expiry — the link in an old
// email must still work. Used for the List-Unsubscribe header (Gmail /
// Yahoo one-click) and the footer link.
const PURPOSE = "email-unsubscribe";

const unsubscribeToken = (membershipId) =>
  jwt.sign({ uid: membershipId, purpose: PURPOSE }, process.env.JWT_SECRET);

const readUnsubscribeToken = (token) => {
  try {
    const decoded = jwt.verify(String(token || ""), process.env.JWT_SECRET);
    return decoded.purpose === PURPOSE ? decoded.uid : null;
  } catch {
    return null;
  }
};

const unsubscribeUrl = (membershipId) =>
  `${process.env.BACKEND_URL}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken(membershipId))}`;

module.exports = { unsubscribeUrl, readUnsubscribeToken };
