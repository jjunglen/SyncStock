const express = require("express");
const router = express.Router();
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const {
  searchCatalog,
  handleOAuthCallback,
  getAuthUrl,
  cacheImage,
} = require("../controllers/stockx.controller.js");

router.get("/search", authenticateAccount, searchCatalog);
router.post("/image-cache", authenticateAccount, cacheImage);
router.get("/auth", getAuthUrl);
router.get("/callback", handleOAuthCallback);

module.exports = router;
