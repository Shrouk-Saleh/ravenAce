const express = require("express");
const {
  startExam,
  saveAnswer,
  submitExam,
  getAttemptResult,
  getAttemptHistory,
  logCheatEvent,
  getViolations,
  abandonAttempt,
} = require("../controllers/attemptController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// All attempt routes require login
router.use(protect);

// IMPORTANT: /history must be registered BEFORE /:id
// If /:id comes first, Express matches the string "history" as the :id parameter
// and calls getAttemptResult instead of getAttemptHistory.
router.get("/history", authorize("student"), getAttemptHistory);

router.post("/start", authorize("student"), startExam);
router.patch("/:id/save-answer", authorize("student"), saveAnswer);
router.post("/:id/submit", authorize("student"), submitExam);
router.post("/:id/cheat-event", authorize("student"), logCheatEvent);
router.post("/:id/abandon", authorize("student"), abandonAttempt);

router.get("/:id", authorize("student"), getAttemptResult);
router.get("/:id/violations", authorize("instructor", "admin"), getViolations);

module.exports = router;
