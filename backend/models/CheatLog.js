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
      enum: [
        // Existing (web browser)
        "tab-switch", "fullscreen-exit", "copy", "paste", "right-click",
        // New (Electron engine)
        "focus_lost", "fullscreen_exited", "clipboard_used",
        "forbidden_process", "second_monitor", "window_minimized",
        "shortcut_blocked", "heartbeat_failed", "devtools_attempt",
        "screen_capture_attempt"
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    metadata: {
      description: { type: String, default: "" },
      processName: { type: String, default: null },
      shortcutKey: { type: String, default: null },
      additionalInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    source: {
      type: String,
      enum: ["web", "electron"],
      default: "web",
    },
    detectedAt: { type: Date, default: Date.now },
  },
  { timestamps: false } // detectedAt is enough; no need for createdAt/updatedAt
);

module.exports = mongoose.model("CheatLog", cheatLogSchema);
