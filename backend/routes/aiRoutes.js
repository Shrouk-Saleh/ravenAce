const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAiHealth,
  gradeWritten,
  gradeAllWritten,
  runCodeSandbox,
  submitCode,
  tutorChat,
  getTutorHistory,
  clearTutorHistory,
  generateAiQuestions,
  saveAiQuestions,
  runCheatAnalysis,
  getCheatAnalysis,
  runPerformanceAnalysis,
  getPerformanceAnalysis,
  runPlagiarismDetection,
  getPlagiarismReport,
} = require("../controllers/aiController");

// Health check — any authenticated user
router.get("/health", protect, getAiHealth);

// Written grading — instructor / admin trigger
router.post("/grade-written/:attemptId/:questionId", protect, authorize("instructor", "admin"), gradeWritten);
router.post("/grade-all-written/:attemptId",         protect, authorize("instructor", "admin"), gradeAllWritten);

// Code sandbox — any authenticated user; code submission — students only
router.post("/run-code",                             protect, runCodeSandbox);
router.post("/submit-code/:attemptId/:questionId",   protect, authorize("student"), submitCode);

// AI Tutor — students only
router.post("/tutor/chat",                           protect, authorize("student"), tutorChat);
router.get("/tutor/history/:examId",                 protect, authorize("student"), getTutorHistory);
router.delete("/tutor/history/:examId",              protect, authorize("student"), clearTutorHistory);

// Question Generator — instructors + admins
router.post("/generate-questions",                   protect, authorize("instructor", "admin"), generateAiQuestions);
router.post("/save-questions",                       protect, authorize("instructor", "admin"), saveAiQuestions);

// Cheat Analysis — instructors + admins
router.post("/analyze-cheat/:attemptId",             protect, authorize("instructor", "admin"), runCheatAnalysis);
router.get("/analyze-cheat/:attemptId",              protect, authorize("instructor", "admin"), getCheatAnalysis);

// Performance Analysis — any authenticated user (student views own, instructor views any)
router.post("/analyze-performance/:attemptId",       protect, runPerformanceAnalysis);
router.get("/analyze-performance/:attemptId",        protect, getPerformanceAnalysis);

// Plagiarism Detection — instructors + admins
router.post("/plagiarism/:examId",                   protect, authorize("instructor", "admin"), runPlagiarismDetection);
router.get("/plagiarism/:examId",                    protect, authorize("instructor", "admin"), getPlagiarismReport);

module.exports = router;
