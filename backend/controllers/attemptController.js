const Attempt = require("../models/Attempt");
const Exam = require("../models/Exam");
const CheatLog = require("../models/CheatLog");
const { AppError } = require("../utils/errorUtils");
const { createCertificateIfPassed } = require("./certificateController");
const { createNotification } = require("./notificationController");
const { VIOLATION_TYPES } = require("../utils/constants");
const { gradeWrittenAnswer } = require("../services/writtenGraderService");
const { gradeCodeAnswer } = require("../services/codeGraderService");

// How many violations before the exam is auto-submitted
const { MAX_VIOLATIONS } = require("../utils/constants");

// ─── Security: Strip answer keys from questions before sending to students ───
// This prevents students from reading correct answers via DevTools/Network tab.
// Pattern matches examController.getExamById's redaction, extended to also strip
// modelAnswer, gradingCriteria, and hidden test case expectedOutputs.
const sanitizeQuestionsForStudent = (questions) => {
  if (!questions) return [];
  return questions.filter(Boolean).map((q) => {
    const qObj = q.toObject ? q.toObject() : { ...q };
    delete qObj.correctAnswer;
    delete qObj.explanation;
    delete qObj.modelAnswer;
    delete qObj.gradingCriteria;
    // Strip hidden test case expected outputs (students shouldn't see these)
    if (qObj.testCases && Array.isArray(qObj.testCases)) {
      qObj.testCases = qObj.testCases.map((tc) => {
        if (tc.isHidden) {
          const { expectedOutput, ...rest } = tc;
          return rest;
        }
        return tc;
      });
    }
    return qObj;
  });
};

// ─── Shared full grading helper ───────────────────────────────────────────
// Grades AI questions, calculates score, applies penalties, updates status, and saves.
const gradeAndScore = async (attempt, exam, timedOut = false) => {
  // Grade every question using the shared helper (sync for MCQ/TF)
  const { correctCount, perQuestionResult } = gradeAttempt(
    exam.questions,
    attempt.savedAnswers
  );

  // Auto-grade written and coding questions sequentially
  for (const q of exam.questions) {
    const rIdx = perQuestionResult.findIndex(r => r.question.toString() === q._id.toString());
    if (rIdx === -1) continue;
    const r = perQuestionResult[rIdx];

    if (q.type === "written") {
      try {
        const gradeResult = await gradeWrittenAnswer({
          questionText: q.text,
          modelAnswer: q.modelAnswer || "",
          gradingCriteria: q.gradingCriteria || "",
          studentAnswer: r.studentAnswer || "",
          maxScore: q.maxScore || 10,
        });
        r.score = gradeResult.score;
        r.isCorrect = gradeResult.score >= (q.maxScore || 10) * 0.6;
        r.feedback = gradeResult.feedback;
        r.strengths = gradeResult.strengths;
        r.weaknesses = gradeResult.weaknesses;
        r.aiGraded = true;
      } catch (err) {
        console.error("Auto-grade written failed:", err.message);
      }
    } else if (q.type === "coding") {
      try {
        const savedCode = attempt.savedAnswers.find(
          (a) => a.question.toString() === q._id.toString()
        );
        const sourceCode = savedCode?.codeAnswer || "";
        const language = savedCode?.language || "python";

        const gradeResult = await gradeCodeAnswer({
          questionText: q.text,
          sourceCode,
          language,
          testCases: q.testCases || [],
          maxScore: q.maxScore || 10,
        });

        r.studentAnswer = `[${language} code]`;
        r.score = gradeResult.score;
        r.isCorrect = gradeResult.score >= (q.maxScore || 10) * 0.6;
        r.feedback = gradeResult.feedback;
        r.strengths = gradeResult.strengths;
        r.weaknesses = gradeResult.weaknesses;
        r.testResults = gradeResult.testResults;
        r.codeReview = gradeResult.codeReview;
        r.language = language;
        r.aiGraded = true;
      } catch (err) {
        console.error("Auto-grade coding failed:", err.message);
      }
    }
  }

  let score = calculateScore(exam.questions, perQuestionResult, exam.totalScore);
  
  // Deduct points for violations
  const violationCount = await CheatLog.countDocuments({ attempt: attempt._id });
  const penaltyPerViolation = Math.round(exam.totalScore * 0.05); // 5% penalty
  const totalPenalty = violationCount * penaltyPerViolation;
  score = Math.max(0, score - totalPenalty);

  const passed = score >= exam.passingScore;
  const now = new Date();

  // Server-side Time Validation (60s grace period)
  const timeTakenSec = Math.round((now - attempt.startedAt) / 1000);
  const maxAllowedSec = (exam.duration * 60) + 60;

  let isTimedOut = timedOut;
  if (timeTakenSec > maxAllowedSec) {
    isTimedOut = true;
  }

  attempt.status = isTimedOut ? "timed-out" : "submitted";
  attempt.submittedAt = now;
  attempt.timeTaken = timeTakenSec;
  attempt.score = score;
  attempt.passed = passed;
  attempt.perQuestionResult = perQuestionResult;
  await attempt.save();

  // Auto-create certificate if student passed
  let certificate = null;
  try {
    certificate = await createCertificateIfPassed(attempt);
  } catch (certErr) {
    console.error("Certificate creation failed:", certErr.message);
  }

  // Send in-app notification
  try {
    const msg = passed
      ? `You passed "${exam.title}" with a score of ${score}/${exam.totalScore}. Your certificate is ready!`
      : `You scored ${score}/${exam.totalScore} on "${exam.title}". You did not pass this time.`;
    await createNotification(attempt.student, "result", msg, attempt._id);
  } catch (notifErr) {
    console.error("Notification failed:", notifErr.message);
  }

  // Notify the instructor that a student submitted
  try {
    const studentUser = await require("../models/User").findById(attempt.student).select("name");
    const studentName = studentUser?.name || "A student";
    const cheatFlag = violationCount > 0 ? ` (${violationCount} violation(s) detected)` : "";
    const instructorMsg = `${studentName} submitted "${exam.title}" — scored ${score}/${exam.totalScore}${cheatFlag}.`;
    await createNotification(exam.instructor, "result", instructorMsg, attempt._id);
  } catch (notifErr) {
    console.error("Instructor notification failed:", notifErr.message);
  }

  return { score, passed, correctCount, violationCount, totalPenalty, certificate };
};

// Async wrapper for gradeAndScore to handle background execution and errors
const processBackgroundGrading = async (attempt, exam, timedOut) => {
  try {
    await gradeAndScore(attempt, exam, timedOut);
  } catch (err) {
    console.error("Background grading failed:", err.message);
    await Attempt.updateOne(
      { _id: attempt._id },
      { $set: { status: "error" } }
    );
  }
};
// Extracted into its own function so both submitExam and logCheatEvent
// use exactly the same grading logic — no duplication, no inconsistency.
// NOTE: This only grades MCQ and True/False questions synchronously.
// Written and coding questions are graded separately by AI (async).
const gradeAttempt = (examQuestions, savedAnswers) => {
  let correctCount = 0;

  const perQuestionResult = examQuestions.map((q) => {
    const saved = savedAnswers.find(
      (a) => a.question.toString() === q._id.toString()
    );

    // Written and coding questions: not auto-graded here — AI grades them later.
    // Return a placeholder so the result array has an entry for every question.
    if (q.type === "written" || q.type === "coding") {
      const studentAnswer = saved ? (saved.answer || saved.codeAnswer || "") : "";
      return {
        question: q._id,
        studentAnswer,
        correctAnswer: "",
        isCorrect: false,       // AI will update this after grading
        score: 0,               // AI will update this after grading
        maxScore: q.maxScore || 10,
        aiGraded: false,
        feedback: "",
        strengths: [],
        weaknesses: [],
      };
    }

    // MCQ / True-False: exact string match
    const studentAnswer = saved ? saved.answer : "";
    const isCorrect = studentAnswer.length > 0 && studentAnswer === q.correctAnswer;
    if (isCorrect) correctCount++;

    return {
      question: q._id,
      studentAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
    };
  });

  return { correctCount, perQuestionResult };
};

// Calculate the total score for an attempt.
// MCQ/TF questions share the exam's totalScore proportionally.
// Written/coding questions contribute their AI-awarded score proportionally to totalScore.
const calculateScore = (examQuestions, perQuestionResult, totalScore) => {
  const gradedQuestions = examQuestions.filter(
    (q) => q.type !== "written" && q.type !== "coding"
  );
  const aiQuestions = examQuestions.filter(
    (q) => q.type === "written" || q.type === "coding"
  );

  if (examQuestions.length === 0) return 0;

  // Fraction of totalScore each MCQ/TF question is worth
  const pointsPerMcq = gradedQuestions.length > 0
    ? (totalScore * (gradedQuestions.length / examQuestions.length)) / gradedQuestions.length
    : 0;

  // Fraction of totalScore the AI section is worth overall
  const aiSectionMax = totalScore * (aiQuestions.length / examQuestions.length);
  const aiMaxScoreTotal = aiQuestions.reduce((sum, q) => sum + (q.maxScore || 10), 0);

  let score = 0;

  for (const r of perQuestionResult) {
    const q = examQuestions.find((eq) => eq._id.toString() === r.question.toString());
    if (!q) continue;

    if (q.type !== "written" && q.type !== "coding") {
      // It's an MCQ/TF question
      if (r.isCorrect) score += pointsPerMcq;
    } else {
      // It's an AI-graded question
      if (r.aiGraded && r.maxScore > 0) {
        score += (r.score / r.maxScore) * (aiSectionMax / aiQuestions.length);
      }
    }
  }

  return Math.round(Math.min(totalScore, Math.max(0, score)));
};

// ────────────────────────────────────────────────────────────────
// @desc    Start a new exam attempt or resume an existing one
// @route   POST /api/attempts/start
// @access  Student only
// ────────────────────────────────────────────────────────────────
const startExam = async (req, res, next) => {
  try {
    const { examId } = req.body;

    const exam = await Exam.findById(examId)
      .populate("questions")
      .populate("instructor", "organization");

    if (!exam || !exam.isPublished) {
      return next(new AppError("Exam not found or not published.", 404));
    }

    if (exam.securityMode === "lockdown" && req.user.sessionType !== "electron-locked") {
      return next(new AppError("This exam requires the RavenACE Secure Engine.", 403));
    }

    // ── Multi-Tenant Security Check ────────────────────────────────────────
    // Ensure the student is allowed to take this exam.
    // Org students can only take exams from their org's instructors.
    // Public students can only take exams from public instructors.
    const User = require("../models/User");
    const student = await User.findById(req.user._id);

    if (student.organization) {
      // Student is in an org. Instructor must be in the SAME org.
      if (
        !exam.instructor.organization ||
        exam.instructor.organization.toString() !== student.organization.toString()
      ) {
        return next(new AppError("Not authorized to take this exam.", 403));
      }
    } else {
      // Student is public. Instructor must also be public.
      if (exam.instructor.organization) {
        return next(new AppError("Not authorized to take this exam.", 403));
      }
    }

    // ── Resume check ───────────────────────────────────────────────────────
    // If the student refreshes the page mid-exam, return the same attempt
    // so they don't lose their saved answers or the time elapsed.
    const existing = await Attempt.findOne({
      student: req.user._id,
      exam: examId,
      status: "in-progress",
    })
      .populate("questions")
      .populate("exam", "title duration totalScore passingScore");

    if (existing) {
      // SECURITY: Strip answer keys before sending to client
      const sanitized = existing.toObject();
      sanitized.questions = sanitizeQuestionsForStudent(existing.questions);
      return res.status(200).json({
        status: "success",
        message: "Resuming existing attempt.",
        resumed: true,
        data: { attempt: sanitized },
      });
    }

    // ── Max attempts check ─────────────────────────────────────────────────
    // Count all terminal attempt states (including "abandoned") toward the
    // limit — abandoning no longer grants an extra attempt (fix for B2).
    const completedCount = await Attempt.countDocuments({
      student: req.user._id,
      exam: examId,
      status: { $in: ["submitted", "timed-out", "auto-submitted", "abandoned"] },
    });

    if (completedCount >= exam.maxAttempts) {
      return next(
        new AppError(
          "You have used all allowed attempts for this exam.",
          403
        )
      );
    }

    // ── Build question order ───────────────────────────────────────────────
    let questionIds = exam.questions.filter(Boolean).map((q) => q._id);

    if (exam.shuffle) {
      // Fisher-Yates shuffle — guaranteed unbiased unlike .sort(() => Math.random() - 0.5)
      for (let i = questionIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionIds[i], questionIds[j]] = [questionIds[j], questionIds[i]];
      }
    }

    const attempt = await Attempt.create({
      student: req.user._id,
      exam: examId,
      questions: questionIds,
      attemptNumber: completedCount + 1,
    });

    await attempt.populate("questions");
    await attempt.populate("exam", "title duration totalScore passingScore");

    // SECURITY: Strip answer keys before sending to client
    const sanitized = attempt.toObject();
    sanitized.questions = sanitizeQuestionsForStudent(attempt.questions);
    res.status(201).json({
      status: "success",
      message: "Exam started.",
      resumed: false,
      data: { attempt: sanitized },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Auto-save a single answer
// @route   PATCH /api/attempts/:id/save-answer
// @access  Student only
// ────────────────────────────────────────────────────────────────
// Called every time the student selects an option.
// If the DB already has an answer for this question, update it.
// Otherwise, push a new entry. This means no work is ever lost
// even if the browser crashes or the connection drops.
const saveAnswer = async (req, res, next) => {
  try {
    const { questionId, answer, codeAnswer, language } = req.body;

    // Validate questionId — reject undefined or non-string values early.
    // Without this, findIndex always returns -1 and garbage is pushed into savedAnswers.
    if (!questionId || typeof questionId !== "string") {
      return next(new AppError("questionId is required and must be a string.", 400));
    }

    const attempt = await Attempt.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: "in-progress",
    }).populate("exam");

    if (!attempt) {
      return next(new AppError("Active attempt not found.", 404));
    }

    const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime();
    const allowedMs = attempt.exam.duration * 60 * 1000 + 60 * 1000; // duration (minutes) + 60s grace period
    if (elapsedMs > allowedMs) {
      return next(new AppError("Time limit exceeded for this attempt.", 400));
    }

    if (attempt.exam.securityMode === "lockdown" && req.user.sessionType !== "electron-locked") {
      return next(new AppError("This exam requires the RavenACE Secure Engine.", 403));
    }

    const idx = attempt.savedAnswers.findIndex(
      (a) => a.question.toString() === questionId
    );

    if (idx !== -1) {
      if (answer !== undefined) attempt.savedAnswers[idx].answer = answer;
      if (codeAnswer !== undefined) attempt.savedAnswers[idx].codeAnswer = codeAnswer;
      if (language !== undefined) attempt.savedAnswers[idx].language = language;
    } else {
      attempt.savedAnswers.push({ question: questionId, answer, codeAnswer, language }); // new answer
    }

    // markModified is required because Mongoose does not detect mutations
    // inside array sub-documents automatically.
    attempt.markModified("savedAnswers");
    await attempt.save();

    res.status(200).json({ status: "success", message: "Answer saved." });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Submit the exam and grade it immediately
// @route   POST /api/attempts/:id/submit
// @access  Student only
// ────────────────────────────────────────────────────────────────
// Handles both manual submit (student clicks button) and
// timer-triggered auto-submit (frontend sends timedOut: true).
const submitExam = async (req, res, next) => {
  try {
    // SECURITY (M1): Atomic status transition to prevent double-submit race conditions
    const attempt = await Attempt.findOneAndUpdate(
      { _id: req.params.id, student: req.user._id, status: "in-progress" },
      { $set: { status: "grading" } },
      { new: true }
    );

    if (!attempt) {
      // It might already be grading/submitted
      const checkStatus = await Attempt.findById(req.params.id);
      if (checkStatus && checkStatus.status !== "in-progress") {
        return res.status(200).json({ status: "success", message: "Exam already submitted or grading." });
      }
      return next(new AppError("Active attempt not found.", 404));
    }

    const exam = await Exam.findById(attempt.exam).populate("questions");
    exam.questions = exam.questions.filter(Boolean);

    if (exam.securityMode === "lockdown" && req.user.sessionType !== "electron-locked") {
      await Attempt.updateOne(
        { _id: req.params.id, status: "grading" },
        { $set: { status: "in-progress" } }
      );
      return next(new AppError("This exam requires the RavenACE Secure Engine.", 403));
    }

    // Run grading in the background without awaiting it
    processBackgroundGrading(attempt, exam, req.body.timedOut);

    res.status(202).json({
      status: "success",
      message: "Exam submitted. Grading is in progress.",
      data: {
        attemptId: attempt._id,
        status: "grading"
      },
    });
  } catch (err) {
    // Revert status on immediate failure before background task starts
    await Attempt.updateOne(
      { _id: req.params.id, status: "grading" },
      { $set: { status: "in-progress" } }
    ).catch(e => console.error("Could not revert grading status:", e));
    
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get full result for one attempt (with per-question breakdown)
// @route   GET /api/attempts/:id
// @access  Student only (own attempts)
// ────────────────────────────────────────────────────────────────
const getAttemptResult = async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.id,
      student: req.user._id,
    })
      .populate(
        "perQuestionResult.question",
        "text options correctAnswer explanation"
      )
      .populate("exam", "title duration totalScore passingScore");

    if (!attempt) return next(new AppError("Attempt not found.", 404));

    res.status(200).json({
      status: "success",
      data: { attempt },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get all past attempts by this student (paginated)
// @route   GET /api/attempts/history
// @access  Student only
// ────────────────────────────────────────────────────────────────
const getAttemptHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Only show completed, gradeable attempts — not in-progress or abandoned
    const query = {
      student: req.user._id,
      status: { $in: ["submitted", "timed-out", "auto-submitted"] },
    };
    const total = await Attempt.countDocuments(query);

    const attempts = await Attempt.find(query)
      .populate("exam", "title totalScore passingScore")
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      status: "success",
      results: attempts.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      data: { attempts },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Log a cheat violation — auto-submit if MAX_VIOLATIONS reached
// @route   POST /api/attempts/:id/cheat-event
// @access  Student only
// ────────────────────────────────────────────────────────────────
// The frontend calls this every time it detects a violation.
// The backend logs it, counts the total, and auto-submits if needed.
// Auto-submit happens server-side so the student cannot prevent it
// by tampering with the browser or disabling JavaScript.
const logCheatEvent = async (req, res, next) => {
  try {
    const { eventType } = req.body;

    if (!VIOLATION_TYPES.includes(eventType)) {
      return next(new AppError("Invalid event type.", 400));
    }

    const attemptForCheck = await Attempt.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: "in-progress"
    }).populate("exam");

    if (!attemptForCheck) {
      return next(new AppError("Active attempt not found.", 404));
    }

    if (attemptForCheck.exam.securityMode === "lockdown" && req.user.sessionType !== "electron-locked") {
      return next(new AppError("This exam requires the RavenACE Secure Engine.", 403));
    }

    // 1. Record the violation
    await CheatLog.create({
      attempt: req.params.id,
      student: req.user._id,
      eventType,
    });

    const total = await CheatLog.countDocuments({ attempt: req.params.id });

    // 2. Check if we need to auto-submit
    if (total >= MAX_VIOLATIONS) {
      const attempt = await Attempt.findOneAndUpdate(
        { _id: req.params.id, student: req.user._id, status: "in-progress" },
        { $set: { status: "grading" } },
        { new: true }
      );

      if (attempt) {
        const exam = await Exam.findById(attempt.exam).populate("questions");
        exam.questions = exam.questions.filter(Boolean);

        processBackgroundGrading(attempt, exam, false);

        // Notify the instructor about the cheat auto-submit immediately
        try {
          const studentUser = await require("../models/User").findById(attempt.student).select("name");
          const studentName = studentUser?.name || "A student";
          const cheatMsg = `${studentName} was auto-submitted from "${exam.title}" due to ${total} security violation(s).`;
          await createNotification(exam.instructor, "result", cheatMsg, attempt._id);
        } catch (notifErr) {
          console.error("Cheat instructor notification failed:", notifErr.message);
        }

        return res.status(202).json({
          status: "success",
          autoSubmitted: true,
          message: "Attempt automatically submitted due to excessive cheating. Grading in progress.",
          data: {
            attemptId: attempt._id,
            status: "grading"
          },
        });
      }
    }

    // 4. Still under the limit — send a warning back to the frontend
    res.status(200).json({
      status: "success",
      autoSubmitted: false,
      message: `Warning: ${eventType} detected.`,
      violationCount: total,
      violationsLeft: MAX_VIOLATIONS - total,
      maxViolations: MAX_VIOLATIONS,
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get all cheat violations for an attempt (instructor view)
// @route   GET /api/attempts/:id/violations
// @access  Instructor or Admin
// ────────────────────────────────────────────────────────────────
const getViolations = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id).populate('exam', 'instructor');
    if (!attempt) return next(new AppError('Attempt not found.', 404));

    if (req.user.role === 'instructor' && attempt.exam.instructor.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized.', 403));
    }

    const logs = await CheatLog.find({ attempt: req.params.id })
      .populate("student", "name email")
      .sort({ detectedAt: 1 }); // chronological order

    res.status(200).json({
      status: "success",
      results: logs.length,
      data: { violations: logs },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Abandon an attempt (if it crashes)
// @route   POST /api/attempts/:id/abandon
// @access  Student only
// ────────────────────────────────────────────────────────────────
const abandonAttempt = async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: "in-progress",
    });

    if (!attempt) return next(new AppError("Active attempt not found.", 404));

    attempt.status = "abandoned";
    await attempt.save();

    res.status(200).json({
      status: "success",
      message: "Attempt abandoned successfully.",
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get the current grading status of an attempt
// @route   GET /api/attempts/:id/status
// @access  Student only (own attempts)
// ────────────────────────────────────────────────────────────────
const getAttemptStatus = async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.id,
      student: req.user._id,
    }).select("status");

    if (!attempt) return next(new AppError("Attempt not found.", 404));

    res.status(200).json({
      status: "success",
      data: { status: attempt.status },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startExam,
  saveAnswer,
  submitExam,
  getAttemptResult,
  getAttemptHistory,
  logCheatEvent,
  getViolations,
  getAttemptStatus,
  abandonAttempt,
  calculateScore,
};
