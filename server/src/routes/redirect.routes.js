const express = require("express");
const router = express.Router();
const {
  attachAccountIfPresent,
} = require("../middleware/tenant.middleware.js");
const { trackRedirect } = require("../controllers/redirect.controller.js");

router.get("/", attachAccountIfPresent, trackRedirect);

module.exports = router;
