// routes/resultRoutes.js
const express = require("express");
const {
  getMyResult,
  getMyHistory,
  getExamAttempts,
  getAttemptDetail,
  exportCSV,
  exportPDF,
  updateManualGrade,
} = require("../controllers/resultController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

// Student routes
router.get("/my-history", authorize("student"), getMyHistory);
router.get("/:attemptId", authorize("student"), getMyResult);

// Instructor / Admin routes
router.get("/exam/:examId/attempts", authorize("instructor", "admin"), getExamAttempts);
router.get("/exam/:examId/export-csv", authorize("instructor", "admin"), exportCSV);
router.get("/exam/:examId/export-pdf", authorize("instructor", "admin"), exportPDF);
router.get("/attempt/:attemptId/detail", authorize("instructor", "admin"), getAttemptDetail);
router.put("/attempt/:attemptId/grade/:questionId", authorize("instructor", "admin"), updateManualGrade);

module.exports = router;
