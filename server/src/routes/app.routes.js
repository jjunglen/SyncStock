const express = require("express");
const router = express.Router();
const { authenticateApp } = require("../middleware/auth.middleware.js");
const { authLimiter } = require("../middleware/rateLimit.middleware.js");
const {
  login,
  appleSignIn,
  me,
  updateSizes,
  listStores,
  followStore,
  unfollowStore,
  openStore,
  enterStore,
  registerDevice,
  unregisterDevice,
} = require("../controllers/app.controller.js");

// The SyncStock phone app (controllers/app.controller.js). Everything
// but sign-in and /enter needs the app's Bearer login.
router.post("/auth/login", authLimiter, login);
router.post("/auth/apple", authLimiter, appleSignIn);
router.get("/enter", enterStore);

router.use(authenticateApp);

router.get("/me", me);
router.put("/me/sizes", updateSizes);
router.get("/stores", listStores);
router.post("/stores/:subdomain/follow", followStore);
router.delete("/stores/:subdomain/follow", unfollowStore);
router.post("/stores/:subdomain/open", openStore);
router.post("/devices", registerDevice);
router.delete("/devices", unregisterDevice);

module.exports = router;
