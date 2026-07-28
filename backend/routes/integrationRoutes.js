const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { integrationAuth } = require("../middleware/integrationAuth");
const integrationController = require("../controllers/integrationController");

const router = express.Router();

// ── Server-to-server endpoints (requires API Key) ──
router.post("/hirehub/exams", integrationAuth, integrationController.createExam);
router.post("/hirehub/invitations", integrationAuth, integrationController.inviteCandidate);

// ── Public endpoints ──
router.get("/invitations/:token/verify", integrationController.verifyInvitation);
router.post("/invitations/:token/register", integrationController.registerCandidate);
router.post("/invitations/:token/verify-otp", integrationController.verifyCandidateOTP);

// ── Protected endpoints (Requires user login) ──
router.post("/invitations/:token/consume", protect, integrationController.consumeInvitation);

module.exports = router;
