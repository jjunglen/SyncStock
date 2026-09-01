const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
  attachAccountIfPresent,
} = require("../middleware/tenant.middleware.js");
const { trackRedirect } = require("../controllers/redirect.controller.js");

router.get(
  "/",
  resolveStoreFromSubdomain,
  attachAccountIfPresent,
  trackRedirect,
);

module.exports = router;
