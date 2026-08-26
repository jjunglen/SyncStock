const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { subscribe, unsubscribe } = require("../controllers/push.controller.js");

router.use(resolveStoreFromSubdomain, authenticateAccount);

router.post("/subscribe", subscribe);
router.delete("/subscribe", unsubscribe);

module.exports = router;
