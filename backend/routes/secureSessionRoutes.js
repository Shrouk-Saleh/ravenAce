const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

const {
  createSecureSession,
  validateSecureSession,
  launchStatus,
  getLaunchStatus,
  secureHeartbeat,
  logSecureEvent,
  submitSecureExam,
  getExamData,
} = require("../controllers/secureSessionController");

// ── Student React App calls these ───────────────────────────────────────────
router.post("/create", protect, authorize("student"), createSecureSession);
router.get("/launch-status/:attemptId", protect, authorize("student"), getLaunchStatus);

// ── Electron App calls these ────────────────────────────────────────────────
// Validate token (One-time, no JWT yet)
router.post("/validate", validateSecureSession);

// Once validated, Electron uses the newly issued JWT for all subsequent calls
router.get("/exam-data", protect, authorize("student"), getExamData);
router.post("/launch-status", protect, authorize("student"), launchStatus);
router.post("/heartbeat", protect, authorize("student"), secureHeartbeat);
router.post("/event", protect, authorize("student"), logSecureEvent);
router.post("/submit", protect, authorize("student"), submitSecureExam);

module.exports = router;
