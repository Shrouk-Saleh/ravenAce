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
// MUST be raw body. server.js registers express.raw() for this path BEFORE express.json(),
// so no need to apply it again here — doing so would double-wrap and break sig verification.
router.post("/webhook", handleWebhook);

// ── Protected Organization Routes ────────────────────────────────
router.use(protect, authorize("organization"), loadOrganization);

router.post("/create-checkout", createCheckout);
router.post("/billing-portal", getBillingPortal);
router.get("/subscription", getSubscription);
router.post("/cancel", cancelSubscription);

module.exports = router;
