const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const {
  getProfile,
  updateProfile,
  deleteAccount,
} = require("../controllers/user.controller.js");

router.use(resolveStoreFromSubdomain, authenticateAccount);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.delete("/profile", deleteAccount);

module.exports = router;
