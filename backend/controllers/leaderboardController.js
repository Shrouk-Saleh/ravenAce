// controllers/leaderboardController.js
// Two responsibilities:
//   1. Per-exam leaderboard — ranked by score desc, timeTaken asc (fastest wins ties)
//   2. Per-exam statistics  — total attempts, pass rate, avg score, avg time, question analysis

const Attempt = require("../models/Attempt");
const Exam = require("../models/Exam");
const { COMPLETED_ATTEMPT_STATUSES } = require("../utils/constants");
const { AppError } = require("../utils/errorUtils");

// ────────────────────────────────────────────────────────────────
// @desc    Get leaderboard for one exam
// @route   GET /api/leaderboard/:examId
// @access  Any logged-in user
// ────────────────────────────────────────────────────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId)
      .populate("instructor", "organization");
    if (!exam) return next(new AppError("Exam not found.", 404));

    // ── Multi-Tenant Boundary Check ──────────────────────────────────────────
    // Students and instructors can only see leaderboards for exams within their org.
    const User = require("../models/User");
    const reqUser = await User.findById(req.user._id);

    if (req.user.role !== "admin") {
      const userOrgId = reqUser.organization ? reqUser.organization.toString() : null;
      const examOrgId = exam.instructor?.organization ? exam.instructor.organization.toString() : null;

      if (userOrgId !== examOrgId) {
        return next(new AppError("Not authorized to view this leaderboard.", 403));
      }
    }

    // For each student, only count their BEST attempt
    // We use MongoDB aggregation to group by student and pick the highest score.
    const leaderboard = await Attempt.aggregate([
      {
        // Only finished attempts on this exam
        $match: {
          exam: exam._id,
          status: { $in: COMPLETED_ATTEMPT_STATUSES },
          passed: true, // leaderboard shows only passing scores
        },
      },
      {
        // For each student keep only their best score (highest score, lowest time)
        $sort: { score: -1, timeTaken: 1 },
      },
      {
        $group: {
          _id: "$student",
          bestScore: { $first: "$score" },
          bestTimeTaken: { $first: "$timeTaken" },
          attemptId: { $first: "$_id" },
          submittedAt: { $first: "$submittedAt" },
        },
      },
      { $sort: { bestScore: -1, bestTimeTaken: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },
      {
        $project: {
          _id: 0,
          studentId: "$_id",
          name: "$studentInfo.name",
          profilePhoto: "$studentInfo.profilePhoto",
          score: "$bestScore",
          timeTaken: "$bestTimeTaken",
          attemptId: 1,
          submittedAt: 1,
        },
      },
    ]);

    // Add rank number and flag current user
    const fullRanked = leaderboard.map((entry, i) => ({
      rank: i + 1,
      ...entry,
      isCurrentUser: entry.studentId.toString() === req.user._id.toString(),
    }));

    // Find current user's position even if they're outside top 50
    const currentUserEntry = fullRanked.find(e => e.isCurrentUser) || null;
    const currentUserRank = currentUserEntry ? currentUserEntry.rank : null;

    // Slice to top 50 for the leaderboard display
    const top50 = fullRanked.slice(0, 50);

    res.status(200).json({
      status: "success",
      data: {
        exam: { _id: exam._id, title: exam.title, totalScore: exam.totalScore },
        leaderboard: top50,
        currentUser: currentUserEntry,
        currentUserRank,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get statistics for one exam (instructor/admin)
// @route   GET /api/leaderboard/:examId/stats
// @access  Instructor (own exam) or Admin
// ────────────────────────────────────────────────────────────────
const getExamStats = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId).populate("questions");
    if (!exam) return next(new AppError("Exam not found.", 404));

    if (
      req.user.role === "instructor" &&
      exam.instructor.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorized for this exam.", 403));
    }

    const attempts = await Attempt.find({
      exam: exam._id,
      status: { $in: COMPLETED_ATTEMPT_STATUSES },
    });

    if (attempts.length === 0) {
      return res.status(200).json({
        status: "success",
        data: {
          totalAttempts: 0,
          passRate: 0,
          avgScore: 0,
          avgTime: 0,
          questionStats: [],
        },
      });
    }

    const totalAttempts = attempts.length;
    const passed = attempts.filter(a => a.passed).length;
    const passRate = Math.round((passed / totalAttempts) * 100);
    const avgScore = Math.round(
      attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts
    );
    const avgTime = Math.round(
      attempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / totalAttempts
    );

    // Per-question difficulty: what % of students got each question wrong
    // We pull perQuestionResult from all attempts and tally up
    const questionMap = {}; // questionId -> { correct, total, text }

    for (const attempt of attempts) {
      for (const pq of attempt.perQuestionResult || []) {
        const qId = pq.question?.toString();
        if (!qId) continue;
        if (!questionMap[qId]) {
          questionMap[qId] = { correct: 0, total: 0 };
        }
        questionMap[qId].total++;
        if (pq.isCorrect) questionMap[qId].correct++;
      }
    }

    const questionStats = exam.questions.map(q => {
      const stats = questionMap[q._id.toString()] || { correct: 0, total: 1 };
      return {
        questionId: q._id,
        text: q.text.substring(0, 80) + (q.text.length > 80 ? "…" : ""),
        correctRate: Math.round((stats.correct / stats.total) * 100),
        totalAnswered: stats.total,
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        totalAttempts,
        passRate,
        avgScore,
        avgTime,
        passedCount: passed,
        failedCount: totalAttempts - passed,
        questionStats,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get platform-wide stats (admin dashboard)
// @route   GET /api/leaderboard/admin/overview
// @access  Admin only
// ────────────────────────────────────────────────────────────────
const getAdminOverview = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const Certificate = require("../models/Certificate");

    const [totalUsers, totalExams, totalAttempts, totalCerts] = await Promise.all([
      User.countDocuments(),
      Exam.countDocuments(),
      Attempt.countDocuments({ status: { $ne: "in-progress" } }),
      Certificate.countDocuments(),
    ]);

    // Recent activity — last 10 finished attempts
    const recentAttempts = await Attempt.find({ status: { $ne: "in-progress" } })
      .sort({ submittedAt: -1 })
      .limit(10)
      .populate("student", "name email")
      .populate("exam", "title");

    res.status(200).json({
      status: "success",
      data: {
        totalUsers,
        totalExams,
        totalAttempts,
        totalCerts,
        recentAttempts,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeaderboard, getExamStats, getAdminOverview };
