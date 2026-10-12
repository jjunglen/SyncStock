const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { subscribe, unsubscribe } = require("../controllers/push.controller.js");

// The public half of the push keys — meant to be public; the browser
// needs it to subscribe (client/src/lib/push.js)
router.get("/public-key", (req, res) => {
  const key = (process.env.VAPID_PUBLIC_KEY || "").trim();
  if (!key) return res.status(503).json({ success: false, message: "Push isn't set up" });
  return res.status(200).json({ success: true, data: { key } });
});

router.use(resolveStoreFromSubdomain, authenticateAccount);

router.post("/subscribe", subscribe);
router.delete("/subscribe", unsubscribe);

module.exports = router;
