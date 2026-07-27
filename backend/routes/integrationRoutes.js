const express = require("express");
const { integrationAuth } = require("../middleware/integrationAuth");
const integrationController = require("../controllers/integrationController");

const router = express.Router();

// ── Server-to-server endpoints (requires API Key) ──
router.post("/hirehub/exams", integrationAuth, integrationController.createExam);
router.post("/hirehub/invitations", integrationAuth, integrationController.inviteCandidate);

// ── Public endpoints ──
router.get("/invitations/:token/verify", integrationController.verifyInvitation);

module.exports = router;
