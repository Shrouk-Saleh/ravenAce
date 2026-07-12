const express = require("express");
const {
  getLeaderboard,
  getExamStats,
  getAdminOverview,
} = require("../controllers/leaderboardController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

// admin overview must be BEFORE /:examId to avoid param conflict
router.get("/admin/overview",     authorize("admin"),                getAdminOverview);
router.get("/:examId",                                               getLeaderboard);
router.get("/:examId/stats",      authorize("instructor", "admin"),  getExamStats);

module.exports = router;
