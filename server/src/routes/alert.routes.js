const express = require("express");
const router = express.Router();
const {
  resolveStoreFromSubdomain,
} = require("../middleware/tenant.middleware.js");
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const {
  getAlerts,
  getAlert,
  createAlert,
  updateAlert,
  deleteAlert,
} = require("../controllers/alert.controller.js");

// Every alert belongs to a logged-in customer at the current store
router.use(resolveStoreFromSubdomain, authenticateAccount);

router.get("/", getAlerts);
router.get("/:id", getAlert);
router.post("/", createAlert);
router.put("/:id", updateAlert);
router.delete("/:id", deleteAlert);

module.exports = router;
