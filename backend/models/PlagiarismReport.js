const mongoose = require("mongoose");

// ── SimilarPair sub-schema ─────────────────────────────────────────────────
// Represents one pair of students whose answers are suspiciously similar.
const similarPairSchema = new mongoose.Schema(
  {
    student1: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    student2: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    // Cosine similarity score (0–1). 1 = identical.
    similarity: { type: Number, required: true },
    // True if similarity exceeds the plagiarism threshold (default 0.85)
    flagged: { type: Boolean, default: false },
    // The two answers side by side (for instructor review)
    answer1: { type: String, default: "" },
    answer2: { type: String, default: "" },
    // AI-generated explanation of why these answers are similar
    aiExplanation: { type: String, default: "" },
  },
  { _id: false }
);

// ── PlagiarismReport schema ─────────────────────────────────────────────────
const plagiarismReportSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    // All suspicious pairs found across all written questions in this exam
    pairs: [similarPairSchema],
    // How many pairs were flagged above the threshold
    flaggedCount: { type: Number, default: 0 },
    // Similarity threshold used (0–1)
    threshold: { type: Number, default: 0.85 },
    generatedAt: { type: Date, default: Date.now },
    // Instructor who triggered the analysis
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlagiarismReport", plagiarismReportSchema);
