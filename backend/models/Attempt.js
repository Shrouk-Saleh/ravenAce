const mongoose = require("mongoose");

// ── Saved Answer sub-schema ────────────────────────────────────────────────
// Holds whatever the student currently has entered for a question.
const savedAnswerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    // MCQ / TF / Written: text answer
    answer: { type: String, default: "" },
    // Coding: the submitted source code
    codeAnswer: { type: String, default: "" },
    // Coding: the language chosen by the student (python | javascript | cpp)
    language: { type: String, default: "" },
  },
  { _id: false }
);

// ── Test Result sub-schema ─────────────────────────────────────────────────
// Result of one test case execution from Gemini.
const testResultSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    input: { type: String, default: "" },
    expectedOutput: String,
    actualOutput: { type: String, default: "" },
    passed: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    // Status description (e.g. "Accepted", "Wrong Answer", "Runtime Error")
    status: { type: String, default: "" },
    time: { type: String, default: "" },   // seconds (from Gemini)
    memory: { type: Number, default: 0 },  // KB (from Gemini)
  },
  { _id: false }
);

// ── Per-Question Result sub-schema ─────────────────────────────────────────
// Filled when the attempt is submitted/graded.
const perQuestionResultSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },

    // ── MCQ / TF ────────────────────────────────────────────────────────────
    studentAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean,

    // ── Written / Coding (AI-graded) ────────────────────────────────────────
    // Points awarded (0 to maxScore)
    score: { type: Number, default: 0 },
    // Maximum achievable points for this question
    maxScore: { type: Number, default: 0 },
    // Overall AI feedback paragraph
    feedback: { type: String, default: "" },
    // Bullet-point strengths from AI
    strengths: { type: [String], default: [] },
    // Bullet-point areas for improvement from AI
    weaknesses: { type: [String], default: [] },
    // True once Ollama has returned a grade for this question
    aiGraded: { type: Boolean, default: false },

    // ── Coding only ─────────────────────────────────────────────────────────
    // Results from Gemini for each test case
    testResults: [testResultSchema],
    // AI-generated code review (style, correctness, improvements)
    codeReview: { type: String, default: "" },
    // Language used for submission
    language: { type: String, default: "" },
  },
  { _id: false }
);

// ── Attempt schema ──────────────────────────────────────────────────────────
const attemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    // The ordered list of questions shown to this student.
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],

    // Auto-saved on every answer interaction
    savedAnswers: [savedAnswerSchema],

    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },

    status: {
      type: String,
      enum: ["in-progress", "submitted", "timed-out", "auto-submitted", "abandoned"],
      default: "in-progress",
    },

    // ── Traditional grading (MCQ / TF) ────────────────────────────────────
    score: { type: Number },
    passed: { type: Boolean },
    timeTaken: { type: Number }, // seconds

    attemptNumber: { type: Number, default: 1 },

    // Full per-question breakdown (populated on submit)
    perQuestionResult: [perQuestionResultSchema],

    // ── Secure Session Fields (Electron Engine) ───────────────────────────
    secureSessionToken: { type: String, default: null }, // Hashed one-time token
    lastSeen: { type: Date, default: null }, // Heartbeat
    submissionReason: {
      type: String,
      enum: ["manual", "timer_end", "heartbeat_failed", "forced", "auto_cheat", null],
      default: null,
    },

    // ── AI Analysis refs ──────────────────────────────────────────────────
    // Set after AI performance analysis is generated
    performanceAnalysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiAnalysis",
    },
    // Set after cheat analysis is generated
    cheatAnalysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiAnalysis",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attempt", attemptSchema);
