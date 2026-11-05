const express = require("express");
const router = express.Router();
const { authenticateAccount } = require("../middleware/auth.middleware.js");
const { resolveStoreFromSubdomain, resolveStoreFromAdminMembership } = require("../middleware/tenant.middleware.js");
const { getGuide } = require("../controllers/sellGuide.controller.js");
const shopper = require("../controllers/sell.controller.js");
const merchant = require("../controllers/sellStore.controller.js");

// "Sell your items" (beta).
//   Shopper side — the store from the site's subdomain + a signed-in shopper
//   Merchant side (/store/*) — the store's admins
//   Photos — the shopper who sent them or the store's admins
const atStore = [resolveStoreFromSubdomain, authenticateAccount];
const admin = [authenticateAccount, resolveStoreFromAdminMembership];
// Photos arrive already shrunk on the phone (about 1600px JPEG)
const photoBody = express.raw({ type: ["image/jpeg", "image/png", "image/webp", "application/octet-stream"], limit: "3mb" });

router.get("/store/guide", ...admin, getGuide);
router.get("/store/requests", ...admin, merchant.listStoreRequests);
router.post("/store/requests/:id/offer", ...admin, merchant.sendOffer);
router.post("/store/requests/:id/decline", ...admin, merchant.declineRequest);
router.post("/store/requests/:id/received", ...admin, merchant.markReceived);

router.get("/photos/:id", authenticateAccount, shopper.viewPhoto);
router.delete("/photos/:id", ...atStore, shopper.removePhoto);

router.get("/requests", ...atStore, shopper.listRequests);
router.post("/items", ...atStore, shopper.addItems);
router.put("/items/:id", ...atStore, shopper.updateItem);
router.delete("/items/:id", ...atStore, shopper.removeItem);
router.post("/items/:id/photos", ...atStore, photoBody, shopper.addPhoto);
router.post("/requests/:id/submit", ...atStore, shopper.submitRequest);
router.post("/requests/:id/cancel", ...atStore, shopper.cancelRequest);
router.post("/requests/:id/respond", ...atStore, shopper.respondToOffer);

module.exports = router;
