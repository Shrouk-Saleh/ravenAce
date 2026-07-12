const express = require("express");
const {
  createCheckout,
  getBillingPortal,
  getSubscription,
  cancelSubscription,
  handleWebhook,
} = require("../controllers/stripeController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { loadOrganization } = require("../middleware/orgMiddleware");

const router = express.Router();

// ── Webhook Route ────────────────────────────────────────────────
// MUST be raw body. The server.js configuration ensures express.raw() is used for this route.
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

// ── Protected Organization Routes ────────────────────────────────
router.use(protect, authorize("organization"), loadOrganization);

router.post("/create-checkout", createCheckout);
router.post("/billing-portal", getBillingPortal);
router.get("/subscription", getSubscription);
router.post("/cancel", cancelSubscription);

module.exports = router;
