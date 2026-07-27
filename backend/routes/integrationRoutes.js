const express = require("express");
const { integrationAuth } = require("../middleware/integrationAuth");
const integrationController = require("../controllers/integrationController");

const router = express.Router();

// ── Server-to-server endpoints (requires API Key) ──
router.post("/hirehub/exams", integrationAuth, integrationController.createExam);

module.exports = router;
