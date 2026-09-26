const express = require("express");
const router = express.Router();
const {
  oneClickUnsubscribe,
  unsubscribePage,
} = require("../controllers/unsubscribe.controller.js");

// No login: the signed token in the link identifies the shopper + store
router.get("/", unsubscribePage);
router.post("/", oneClickUnsubscribe);

module.exports = router;
