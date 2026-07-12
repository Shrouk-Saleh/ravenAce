const mongoose = require("mongoose");

// Every detected violation gets its own document.
// Linking to both attempt and student makes it easy to query:
//   - "how many violations does attempt X have?" (for auto-submit logic)
//   - "how many violations has student Y committed?" (for instructor review)
const cheatLogSchema = new mongoose.Schema(
  {
    attempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attempt",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventType: {
      type: String,
      enum: ["tab-switch", "fullscreen-exit", "copy", "paste", "right-click"],
      required: true,
    },
    detectedAt: { type: Date, default: Date.now },
  },
  { timestamps: false } // detectedAt is enough; no need for createdAt/updatedAt
);

module.exports = mongoose.model("CheatLog", cheatLogSchema);
