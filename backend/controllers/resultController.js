// controllers/resultController.js
// Handles everything a student sees after submitting:
//   - their own result detail
//   - full question review with correct/wrong highlighting
//   - all past attempts history
// Also exposes instructor-side: all attempts per exam with CSV export.

const Attempt = require("../models/Attempt");
const Exam = require("../models/Exam");
const { AppError } = require("../utils/errorUtils");
const { calculateScore } = require("./attemptController");
const Certificate = require("../models/Certificate");
const { createCertificateIfPassed } = require("./certificateController");

// ────────────────────────────────────────────────────────────────
// @desc    Get one attempt result for the logged-in student
// @route   GET /api/results/:attemptId
// @access  Student (own attempt only)
// ────────────────────────────────────────────────────────────────
const getMyResult = async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.attemptId,
      student: req.user._id,
    })
      .populate("exam", "title totalScore passingScore duration category")
      .populate(
        "perQuestionResult.question",
        "text options correctAnswer explanation type"
      );

    if (!attempt) return next(new AppError("Result not found.", 404));

    // Only return finished attempts
    if (attempt.status === "in-progress") {
      return next(new AppError("This exam is still in progress.", 400));
    }

    const totalQ = attempt.perQuestionResult?.length || 0;
    const correct = attempt.perQuestionResult?.filter(r => r.isCorrect).length || 0;
    const wrong = attempt.perQuestionResult?.filter(r => !r.isCorrect && r.studentAnswer).length || 0;
    const skipped = attempt.perQuestionResult?.filter(r => !r.studentAnswer).length || 0;

    res.status(200).json({
      status: "success",
      data: {
        attempt,
        summary: {
          score: attempt.score,
          totalScore: attempt.exam?.totalScore,
          passed: attempt.passed,
          timeTaken: attempt.timeTaken,
          correctCount: correct,
          wrongCount: wrong,
          skippedCount: skipped,
          totalQuestions: totalQ,
          percentage: attempt.exam?.totalScore
            ? Math.round((attempt.score / attempt.exam.totalScore) * 100)
            : 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get all past results for the logged-in student
// @route   GET /api/results/my-history
// @access  Student only
// ────────────────────────────────────────────────────────────────
const getMyHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      student: req.user._id,
      status: { $ne: "in-progress" },
    };

    const total = await Attempt.countDocuments(filter);
    const attempts = await Attempt.find(filter)
      .populate("exam", "title totalScore passingScore category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: "success",
      results: attempts.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: { attempts },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get all student attempts for a specific exam (instructor)
// @route   GET /api/results/exam/:examId/attempts
// @access  Instructor (own exams) or Admin
// ────────────────────────────────────────────────────────────────
const getExamAttempts = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return next(new AppError("Exam not found.", 404));

    // Instructors can only view their own exams
    if (
      req.user.role === "instructor" &&
      exam.instructor.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorized for this exam.", 403));
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    const filter = {
      exam: req.params.examId,
      status: { $ne: "in-progress" },
    };

    const total = await Attempt.countDocuments(filter);
    const attempts = await Attempt.find(filter)
      .populate("student", "name email profilePhoto")
      .sort({ score: -1, timeTaken: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: "success",
      results: attempts.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: { attempts },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get one student's full attempt detail (instructor view)
// @route   GET /api/results/attempt/:attemptId/detail
// @access  Instructor or Admin
// ────────────────────────────────────────────────────────────────
const getAttemptDetail = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId)
      .populate("student", "name email profilePhoto")
      .populate("exam", "title totalScore passingScore instructor")
      .populate(
        "perQuestionResult.question",
        "text options correctAnswer explanation type"
      );

    if (!attempt) return next(new AppError("Attempt not found.", 404));

    if (
      req.user.role === "instructor" &&
      attempt.exam.instructor &&
      attempt.exam.instructor.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorized to view this attempt.", 403));
    }

    res.status(200).json({
      status: "success",
      data: { attempt },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Export exam results as CSV
// @route   GET /api/results/exam/:examId/export-csv
// @access  Instructor or Admin
// ────────────────────────────────────────────────────────────────
const exportCSV = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return next(new AppError("Exam not found.", 404));

    if (
      req.user.role === "instructor" &&
      exam.instructor.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorized.", 403));
    }

    const attempts = await Attempt.find({
      exam: req.params.examId,
      status: { $ne: "in-progress" },
    }).populate("student", "name email");

    // Build CSV rows manually — no library needed for simple flat data
    // SECURITY: Sanitize fields to prevent CSV/Excel formula injection.
    // A leading =, +, -, @, tab, or CR in a cell can execute formulas.
    const sanitizeCSV = (val) => {
      const s = String(val || "N/A");
      if (/^[=+\-@\t\r]/.test(s)) return "'" + s; // prefix with single quote
      return s;
    };
    const header = "Name,Email,Score,Total,Passed,Time (sec),Attempt #,Status,Submitted At\n";
    const rows = attempts.map(a => {
      const name = `"${sanitizeCSV(a.student?.name)}"`;
      const email = `"${sanitizeCSV(a.student?.email)}"`;
      return `${name},${email},${a.score},${exam.totalScore},${a.passed},${a.timeTaken},${a.attemptNumber},${a.status},${a.submittedAt?.toISOString() || ""}`;
    });

    const csv = header + rows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${exam.title.replace(/[^a-z0-9]/gi, "_")}_results.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Export exam results as PDF
// @route   GET /api/results/exam/:examId/export-pdf
// @access  Instructor or Admin
// ────────────────────────────────────────────────────────────────
// Uses PDFKit — a pure-JS PDF generator with no external binaries,
// so it works the same way CSV export does (stream straight to res).
const PDFDocument = require("pdfkit");

const exportPDF = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId).populate(
      "instructor",
      "name"
    );
    if (!exam) return next(new AppError("Exam not found.", 404));

    if (
      req.user.role === "instructor" &&
      exam.instructor._id.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorized.", 403));
    }

    const attempts = await Attempt.find({
      exam: req.params.examId,
      status: { $ne: "in-progress" },
    })
      .populate("student", "name email")
      .sort({ score: -1, timeTaken: 1 });

    const filename = `${exam.title.replace(/[^a-z0-9]/gi, "_")}_results.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────
    doc.fontSize(20).fillColor("#004ac6").text("Raven ACE — Exam Results", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor("#0b1c30").text(exam.title);
    doc.fontSize(10).fillColor("#737686")
      .text(`Instructor: ${exam.instructor?.name || "N/A"}`)
      .text(`Category: ${exam.category || "N/A"}   |   Pass mark: ${exam.passingScore}/${exam.totalScore}`)
      .text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(1);

    // ── Summary row ─────────────────────────────────────────────
    const total = attempts.length;
    const passed = attempts.filter(a => a.passed).length;
    const avgScore = total
      ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / total)
      : 0;

    doc.fontSize(11).fillColor("#0b1c30");
    doc.text(`Total Attempts: ${total}    Passed: ${passed}    Pass Rate: ${total ? Math.round((passed / total) * 100) : 0}%    Avg Score: ${avgScore}/${exam.totalScore}`);
    doc.moveDown(1);

    // ── Table header ────────────────────────────────────────────
    const colX = { rank: 40, name: 75, email: 220, score: 380, status: 440, time: 500 };
    const drawHeader = () => {
      doc.fontSize(10).fillColor("#ffffff");
      doc.rect(40, doc.y, 515, 20).fill("#004ac6");
      const y = doc.y - 18;
      doc.fillColor("#ffffff")
        .text("#", colX.rank, y, { width: 30 })
        .text("Name", colX.name, y, { width: 140 })
        .text("Email", colX.email, y, { width: 150 })
        .text("Score", colX.score, y, { width: 55 })
        .text("Status", colX.status, y, { width: 55 })
        .text("Time", colX.time, y, { width: 55 });
      doc.moveDown(1.4);
    };
    drawHeader();

    // ── Table rows ──────────────────────────────────────────────
    attempts.forEach((a, i) => {
      // Add a new page + redraw header if we're near the bottom
      if (doc.y > 760) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      const mins = Math.floor((a.timeTaken || 0) / 60);
      const secs = (a.timeTaken || 0) % 60;

      doc.fontSize(9).fillColor("#0b1c30")
        .text(String(i + 1), colX.rank, y, { width: 30 })
        .text(a.student?.name || "Unknown", colX.name, y, { width: 140 })
        .text(a.student?.email || "-", colX.email, y, { width: 150 })
        .text(`${a.score}/${exam.totalScore}`, colX.score, y, { width: 55 })
        .fillColor(a.passed ? "#1b8a3a" : "#ba1a1a")
        .text(a.passed ? "Passed" : "Failed", colX.status, y, { width: 55 })
        .fillColor("#0b1c30")
        .text(`${mins}m ${secs}s`, colX.time, y, { width: 55 });

      doc.moveDown(1.1);

      // light row separator
      doc.moveTo(40, doc.y - 4).lineTo(555, doc.y - 4)
        .strokeColor("#e5eeff").lineWidth(0.5).stroke();
    });

    if (attempts.length === 0) {
      doc.fontSize(10).fillColor("#737686").text("No attempts yet.");
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Manually override the grade of a specific question for an attempt
// @route   PUT /api/results/attempt/:attemptId/grade/:questionId
// @access  Instructor or Admin
// ────────────────────────────────────────────────────────────────
const updateManualGrade = async (req, res, next) => {
  try {
    const { attemptId, questionId } = req.params;
    const { score, isCorrect, feedback } = req.body;

    const attempt = await Attempt.findById(attemptId).populate("exam");
    if (!attempt) return next(new AppError("Attempt not found.", 404));

    // Verify instructor ownership
    if (
      req.user.role === "instructor" &&
      attempt.exam.instructor.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorized.", 403));
    }

    const questionResult = attempt.perQuestionResult.find(
      (r) => r.question.toString() === questionId
    );
    if (!questionResult) {
      return next(new AppError("Question result not found in attempt.", 404));
    }

    // We need the populated exam questions to know the question type
    const exam = await Exam.findById(attempt.exam._id).populate("questions");
    const qDoc = exam.questions.find(q => q && q._id.toString() === questionId);

    // Update the values based on question type
    if (qDoc) {
      if (['written', 'coding'].includes(qDoc.type)) {
        if (score !== undefined) {
          questionResult.score = score;
          questionResult.isCorrect = score > 0; // Mark correct if any points awarded
          questionResult.aiGraded = true; // Force calculateScore to count it
        }
      } else {
        if (isCorrect !== undefined) {
          questionResult.isCorrect = isCorrect;
        }
      }
    }

    if (feedback !== undefined) questionResult.feedback = feedback;

    // Recalculate score
    const newTotalScore = calculateScore(exam.questions.filter(Boolean), attempt.perQuestionResult, exam.totalScore);

    attempt.score = newTotalScore;
    attempt.passed = newTotalScore >= exam.passingScore;

    // markModified needed because we directly changed an object inside an array
    attempt.markModified("perQuestionResult");
    await attempt.save();

    if (attempt.passed) {
      await createCertificateIfPassed(attempt);
    } else {
      await Certificate.findOneAndDelete({ attempt: attempt._id });
    }

    res.status(200).json({
      status: "success",
      message: "Grade updated successfully.",
      data: {
        score: attempt.score,
        passed: attempt.passed,
        questionResult
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyResult,
  getMyHistory,
  getExamAttempts,
  getAttemptDetail,
  exportCSV,
  exportPDF,
  updateManualGrade,
};
