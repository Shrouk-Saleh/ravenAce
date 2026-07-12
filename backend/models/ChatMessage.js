const mongoose = require("mongoose");

// ── ChatMessage ─────────────────────────────────────────────────────────────
// Stores the conversation history between a student and the AI Tutor
// for a specific exam context. History is kept so Ollama receives full
// conversation context on follow-up messages.
const chatMessageSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The exam the student is studying for (tutor context)
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    // "user" = student message, "assistant" = Ollama response
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Index for fast retrieval of a student's chat history for a given exam
chatMessageSchema.index({ student: 1, exam: 1, createdAt: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
