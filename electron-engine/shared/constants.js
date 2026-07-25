// ─────────────────────────────────────────────────────────────────────────────
// shared/constants.js — All constants for the Electron engine
// ─────────────────────────────────────────────────────────────────────────────
//
// Every magic string and value lives here.
// No hardcoded values anywhere else in the codebase.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom protocol scheme for deep linking.
 * Used by React to launch the Electron engine: ravenace://start?token=xxx
 */
const PROTOCOL_SCHEME = 'ravenace';

/**
 * IPC channel names — every channel used between main ↔ renderer.
 * Naming convention: 'raven:<domain>:<action>'
 */
const IPC_CHANNELS = {
  // Launcher
  DEEP_LINK_RECEIVED: 'raven:deep-link-received',
  LAUNCH_RESULT: 'raven:launch-result',

  // Session
  SESSION_VALIDATE: 'raven:session:validate',
  SESSION_GET_STATE: 'raven:session:get-state',
  SESSION_STATE_CHANGED: 'raven:session:state-changed',

  // Exam
  EXAM_GET_DATA: 'raven:exam:get-data',
  EXAM_SAVE_ANSWER: 'raven:exam:save-answer',
  EXAM_SUBMIT: 'raven:exam:submit',
  EXAM_FORCED_SUBMIT: 'raven:exam:forced-submit',
  EXAM_RUN_CODE: 'raven:exam:run-code',

  // Timer
  TIMER_GET_REMAINING: 'raven:timer:get-remaining',
  TIMER_UPDATE: 'raven:timer:update',

  // Security
  VIOLATION_WARNING: 'raven:security:violation-warning',

  // App lifecycle
  APP_REQUEST_EXIT: 'raven:app:request-exit',
};

/**
 * Launch results reported back to React.
 */
const LAUNCH_RESULTS = {
  LAUNCHED_SUCCESSFULLY: 'LAUNCHED_SUCCESSFULLY',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  ALREADY_RUNNING: 'ALREADY_RUNNING',
};

/**
 * Session states emitted by SessionGuardian.
 */
const SESSION_STATES = {
  INITIALIZING: 'INITIALIZING',
  VALIDATING: 'VALIDATING',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  HEARTBEAT_FAILED: 'HEARTBEAT_FAILED',
  FORCED_SUBMIT: 'FORCED_SUBMIT',
  SUBMITTED: 'SUBMITTED',
  ERROR: 'ERROR',
};

/**
 * Violation event types emitted by security monitors.
 * These map to the CheatLog eventType enum in the backend.
 */
const VIOLATION_EVENTS = {
  FOCUS_LOST: 'focus_lost',
  FULLSCREEN_EXITED: 'fullscreen_exited',
  CLIPBOARD_USED: 'clipboard_used',
  FORBIDDEN_PROCESS: 'forbidden_process',
  SECOND_MONITOR: 'second_monitor',
  WINDOW_MINIMIZED: 'window_minimized',
  SHORTCUT_BLOCKED: 'shortcut_blocked',
  HEARTBEAT_FAILED: 'heartbeat_failed',
  DEVTOOLS_ATTEMPT: 'devtools_attempt',
  SCREEN_CAPTURE_ATTEMPT: 'screen_capture_attempt',
  VM_DETECTED: 'vm_detected',
  SCREEN_RECORDER_DETECTED: 'screen_recorder_detected',
  PROCESS_KILLED: 'process_killed',
  DEBUGGER_DETECTED: 'debugger_detected',
  INSPECTOR_DETECTED: 'inspector_detected',
  PROXY_DETECTED: 'proxy_detected',
  CONFIG_TAMPERED: 'config_tampered',
  DISPLAY_HOT_PLUG: 'display_hot_plug',
  DISPLAY_REMOVED: 'display_removed',
  DISPLAY_METRICS_CHANGED: 'display_metrics_changed',
  RDP_DETECTED: 'rdp_detected',
  VIRTUAL_DISPLAY_DETECTED: 'virtual_display_detected',
  RENAMED_PROCESS_DETECTED: 'renamed_process_detected',
};

/**
 * Severity levels for violation events.
 */
const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Submission reasons sent with the submit request.
 */
const SUBMISSION_REASONS = {
  MANUAL: 'manual',
  TIMER_END: 'timer_end',
  HEARTBEAT_FAILED: 'heartbeat_failed',
  FORCED: 'forced',
};

/**
 * Backend API endpoint paths (relative to base URL).
 */
const API_ENDPOINTS = {
  SECURE_SESSION_CREATE: '/api/secure-session/create',
  SECURE_SESSION_VALIDATE: '/api/secure-session/validate',
  SECURE_SESSION_HEARTBEAT: '/api/secure-session/heartbeat',
  SECURE_SESSION_EVENT: '/api/secure-session/event',
  SECURE_SESSION_SUBMIT: '/api/secure-session/submit',
  ATTEMPTS_SAVE_ANSWER: '/api/attempts', // + /:id/save-answer
};

module.exports = {
  PROTOCOL_SCHEME,
  IPC_CHANNELS,
  LAUNCH_RESULTS,
  SESSION_STATES,
  VIOLATION_EVENTS,
  SEVERITY_LEVELS,
  SUBMISSION_REASONS,
  API_ENDPOINTS,
};
