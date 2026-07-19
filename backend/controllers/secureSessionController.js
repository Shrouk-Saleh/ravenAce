const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Attempt = require("../models/Attempt");
const CheatLog = require("../models/CheatLog");
const { AppError } = require("../utils/errorUtils");
// We reuse the submit logic from attemptController
const { submitExam } = require("./attemptController");
const MAX_VIOLATIONS = 3;

// ── In-Memory Launch Status Store ──────────────────────────────────────────
// Maps attemptId -> { status, message }
// React polls /launch-status/:attemptId to see if Electron launched successfully.
const launchStatuses = new Map();

// Generate a SHA-256 hash of a string
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a secure session (one-time token) for an existing attempt
// @route   POST /api/secure-session/create
// @access  Student only
// ─────────────────────────────────────────────────────────────────────────────
const createSecureSession = async (req, res, next) => {
  try {
    const { attemptId } = req.body;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      student: req.user._id,
      status: "in-progress",
    });

    if (!attempt) {
      return next(new AppError("Active attempt not found.", 404));
    }

    // Generate a secure one-time token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Store only the hash in the database
    attempt.secureSessionToken = hashToken(token);
    await attempt.save();

    res.status(200).json({
      status: "success",
      message: "Secure session token generated.",
      data: {
        token, // Raw token sent to client ONCE
        attemptId: attempt._id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Validate a one-time token and issue a JWT
// @route   POST /api/secure-session/validate
// @access  Electron Engine (No Auth Required)
// ─────────────────────────────────────────────────────────────────────────────
const validateSecureSession = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new AppError("Token is required.", 400));
    }

    const hashedToken = hashToken(token);

    // Find attempt by hashed token
    const attempt = await Attempt.findOne({ secureSessionToken: hashedToken })
      .populate("exam");

    if (!attempt) {
      return next(new AppError("Invalid or expired session token.", 401));
    }

    if (attempt.status !== "in-progress") {
      // Clear token to be safe
      attempt.secureSessionToken = null;
      await attempt.save();
      return next(new AppError("Attempt is no longer in progress.", 400));
    }

    // Token is valid! Burn it so it can never be used again.
    attempt.secureSessionToken = null;
    attempt.lastSeen = new Date();
    await attempt.save();

    // Issue a short-lived JWT specifically for the Electron session
    // Expires based on exam duration + 5 minutes grace period
    const examDurationMinutes = attempt.exam.duration || 60;
    const expiresIn = `${examDurationMinutes + 5}m`;

    const newJwt = jwt.sign(
      { id: attempt.student.toString() },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.status(200).json({
      status: "success",
      message: "Session validated successfully.",
      data: {
        valid: true,
        jwt: newJwt,
        attemptId: attempt._id,
        examId: attempt.exam._id,
        studentId: attempt.student,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Electron Engine reports its launch status
// @route   POST /api/secure-session/launch-status
// @access  Student (Electron)
// ─────────────────────────────────────────────────────────────────────────────
const launchStatus = async (req, res, next) => {
  try {
    const { status, message, attemptId } = req.body;
    
    if (attemptId) {
      launchStatuses.set(attemptId, { status, message, timestamp: Date.now() });
      
      // Cleanup old entries to prevent memory leak (keep for 10 mins max)
      setTimeout(() => {
        launchStatuses.delete(attemptId);
      }, 10 * 60 * 1000);
    }

    res.status(200).json({ status: "success" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    React polls for launch status
// @route   GET /api/secure-session/launch-status/:attemptId
// @access  Student (React)
// ─────────────────────────────────────────────────────────────────────────────
const getLaunchStatus = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const statusData = launchStatuses.get(attemptId);

    if (!statusData) {
      return res.status(200).json({
        status: "success",
        data: { status: "PENDING" },
      });
    }

    res.status(200).json({
      status: "success",
      data: statusData,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update lastSeen heartbeat
// @route   POST /api/secure-session/heartbeat
// @access  Student (Electron)
// ─────────────────────────────────────────────────────────────────────────────
const secureHeartbeat = async (req, res, next) => {
  try {
    const { attemptId } = req.body;
    
    await Attempt.updateOne(
      { _id: attemptId, student: req.user._id },
      { $set: { lastSeen: new Date() } }
    );

    res.status(200).json({ status: "success" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Log a secure violation event
// @route   POST /api/secure-session/event
// @access  Student (Electron)
// ─────────────────────────────────────────────────────────────────────────────
const logSecureEvent = async (req, res, next) => {
  try {
    const { attemptId, eventType, severity, metadata } = req.body;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      student: req.user._id,
      status: "in-progress",
    });

    if (!attempt) {
      return next(new AppError("Active attempt not found.", 404));
    }

    await CheatLog.create({
      attempt: attempt._id,
      student: req.user._id,
      eventType,
      severity: severity || "medium",
      metadata: metadata || {},
      source: "electron",
    });

    // SECURITY: Server-side enforcement.
    // If the client is modified to not auto-submit, the server forces it.
    const count = await CheatLog.countDocuments({ attempt: attempt._id });
    if (count >= MAX_VIOLATIONS) {
      req.body.reason = "forced";
      req.body.timedOut = true;
      return submitExam(req, res, next);
    }

    res.status(200).json({ status: "success" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Submit secure exam
// @route   POST /api/secure-session/submit
// @access  Student (Electron)
// ─────────────────────────────────────────────────────────────────────────────
const submitSecureExam = async (req, res, next) => {
  try {
    const { reason } = req.body; // e.g. "manual", "timer_end", "forced"
    
    // We update the submissionReason first, then call the existing submitExam controller
    // to reuse the entire AI grading pipeline.
    const attempt = await Attempt.findOne({
      _id: req.body.attemptId || req.params.id, // Support it in body for secure session
      student: req.user._id,
      status: "in-progress",
    });

    if (attempt) {
      attempt.submissionReason = reason || "manual";
      await attempt.save();
    }

    // To reuse submitExam, we need req.params.id to be set
    req.params.id = attempt ? attempt._id : (req.body.attemptId || req.params.id);
    
    // For timer_end or forced, pass timedOut to trigger auto-submit logic
    if (reason === "timer_end" || reason === "forced" || reason === "heartbeat_failed") {
      req.body.timedOut = true;
    }

    // Delegate to existing submit flow
    return submitExam(req, res, next);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get populated exam data for the secure session
// @route   GET /api/secure-session/exam-data
// @access  Student (Electron)
// ─────────────────────────────────────────────────────────────────────────────
const getExamData = async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({
      student: req.user._id,
      status: "in-progress",
    })
      .populate("questions")
      .populate("exam", "title duration totalScore passingScore");

    if (!attempt) {
      return next(new AppError("Active attempt not found.", 404));
    }

    // Must strip answer keys from questions!
    // We'll require the same sanitizeQuestionsForStudent used in attemptController.
    // Wait, attemptController's sanitizeQuestionsForStudent is not exported.
    // We can just manually sanitize them here.
    const sanitized = attempt.toObject();
    if (sanitized.questions) {
      sanitized.questions = sanitized.questions.filter(Boolean).map((q) => {
        delete q.correctAnswer;
        delete q.explanation;
        delete q.modelAnswer;
        delete q.gradingCriteria;
        if (q.testCases && Array.isArray(q.testCases)) {
          q.testCases = q.testCases.map((tc) => {
            if (tc.isHidden) {
              const { expectedOutput, ...rest } = tc;
              return rest;
            }
            return tc;
          });
        }
        return q;
      });
    }

    // Return the shape expected by App.jsx
    // Wait, ExamService.js expects response.data to have `.questions` and `.exam`!
    // App.jsx: const currentQuestion = examData.questions[...]
    // So we must return it exactly like this!
    res.status(200).json({
      ...sanitized // Spreads questions, exam, startedAt directly to root
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSecureSession,
  validateSecureSession,
  launchStatus,
  getLaunchStatus,
  secureHeartbeat,
  logSecureEvent,
  submitSecureExam,
  getExamData,
};
