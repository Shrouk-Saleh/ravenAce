const VIOLATION_TYPES = [
  "tab-switch",
  "fullscreen-exit",
  "copy",
  "paste",
  "right-click",
  "focus_lost",
  "fullscreen_exited",
  "clipboard_used",
  "forbidden_process",
  "second_monitor",
  "window_minimized",
  "shortcut_blocked",
  "heartbeat_failed",
  "devtools_attempt",
  "screen_capture_attempt",
];

const MAX_VIOLATIONS = 5; // exam auto-submits after this many logged violations

const COMPLETED_ATTEMPT_STATUSES = ["submitted", "timed-out", "auto-submitted"];

module.exports = {
  VIOLATION_TYPES,
  MAX_VIOLATIONS,
  COMPLETED_ATTEMPT_STATUSES,
};
