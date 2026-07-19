// ─────────────────────────────────────────────────────────────────────────────
// preload/preload.js — Secure Bridge Between Main and Renderer
// ─────────────────────────────────────────────────────────────────────────────
//
// This is the ONLY way the renderer process communicates with Node.js.
// Every API exposed here is explicitly whitelisted.
// No raw Node.js APIs are ever exposed to the renderer.
//
// IPC Channel Naming Convention: 'raven:<domain>:<action>'
//
// SECURITY RULES (enforced here):
//   - contextBridge.exposeInMainWorld() is the only exposure mechanism
//   - ipcRenderer.invoke() for request/response (main validates all inputs)
//   - ipcRenderer.on() for one-way messages FROM main
//   - ipcRenderer.send() for one-way messages TO main
//   - Never expose ipcRenderer directly
//   - Never expose require, process, or any Node global
// ─────────────────────────────────────────────────────────────────────────────

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ravenAPI', {
  // ── Launcher ────────────────────────────────────────────────────────────
  // Receive the deep link URL from main process
  onDeepLinkReceived: (callback) => {
    ipcRenderer.on('raven:app:init', (_event, data) => callback(data));
  },

  // Report launch result back to main (which may relay to React)
  reportLaunchResult: (result) => {
    ipcRenderer.send('raven:launch-result', result);
  },

  // ── Session ─────────────────────────────────────────────────────────────
  // Validate the one-time token with the backend
  validateToken: (token) => {
    return ipcRenderer.invoke('raven:session:validate', token);
  },

  // Get current session state
  getSessionState: () => {
    return ipcRenderer.invoke('raven:session:get-state');
  },

  // Listen for session state changes (expired, forced submit, etc.)
  onSessionStateChanged: (callback) => {
    ipcRenderer.on('raven:session:state-changed', (_event, state) => callback(state));
  },

  // ── Exam ────────────────────────────────────────────────────────────────
  // Fetch exam questions from backend
  getExamData: () => {
    return ipcRenderer.invoke('raven:exam:get-data');
  },

  // Save an answer (auto-save or manual)
  saveAnswer: (payload) => {
    return ipcRenderer.invoke('raven:exam:save-answer', payload);
  },

  // Submit the exam
  submitExam: (reason) => {
    return ipcRenderer.invoke('raven:exam:submit', reason);
  },

  // Run code sandbox
  runCode: (payload) => {
    return ipcRenderer.invoke('raven:exam:run-code', payload);
  },

  // Listen for forced submission (heartbeat failure, critical violation)
  onForcedSubmit: (callback) => {
    ipcRenderer.on('raven:exam:forced-submit', (_event, data) => callback(data));
  },

  // ── Timer ───────────────────────────────────────────────────────────────
  // Get remaining time from main process (source of truth)
  getTimeRemaining: () => {
    return ipcRenderer.invoke('raven:timer:get-remaining');
  },

  // Listen for timer updates from main process
  onTimerUpdate: (callback) => {
    ipcRenderer.on('raven:timer:update', (_event, secondsLeft) => callback(secondsLeft));
  },

  // Listen for time expired signal
  onTimerExpired: (callback) => {
    ipcRenderer.on('raven:timer:expired', (_event) => callback());
  },

  // ── Security ────────────────────────────────────────────────────────────
  // Listen for violation warnings (to show in-exam toast notifications)
  onSecurityWarning: (callback) => {
    ipcRenderer.on('raven:security:violation-warning', (_event, violation) => callback(violation));
  },

  // Listen for forced submission events
  onForcedSubmit: (callback) => {
    ipcRenderer.on('raven:exam:forced-submit', (_event, data) => callback(data));
  },

  // ── App Lifecycle ───────────────────────────────────────────────────────
  // Receive the initialization signal (with token or error)
  onAppInit: (callback) => {
    ipcRenderer.on('raven:app:init', (_event, data) => callback(data));
  },

  // Request graceful exit (only after submission is confirmed)
  requestExit: () => {
    ipcRenderer.send('raven:app:request-exit');
  },
});

// ── Cleanup on unload ───────────────────────────────────────────────────────
// Remove all listeners when the renderer unloads to prevent memory leaks.
window.addEventListener('beforeunload', () => {
  ipcRenderer.removeAllListeners('raven:app:init');
  ipcRenderer.removeAllListeners('raven:session:state-changed');
  ipcRenderer.removeAllListeners('raven:exam:forced-submit');
  ipcRenderer.removeAllListeners('raven:timer:update');
  ipcRenderer.removeAllListeners('raven:timer:expired');
  ipcRenderer.removeAllListeners('raven:security:violation-warning');
});
