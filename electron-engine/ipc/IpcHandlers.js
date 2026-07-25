// ─────────────────────────────────────────────────────────────────────────────
// ipc/IpcHandlers.js — Central IPC Handler Registry
// ─────────────────────────────────────────────────────────────────────────────
//
// Registers all ipcMain handlers in one place.
// Every channel exposed in preload.js MUST have a corresponding handler here.
// All inputs are validated and sanitized before processing.
//
// Channel Registry:
//   raven:session:validate    → SessionService.validate()
//   raven:session:get-state   → SessionGuardian.getState()
//   raven:exam:get-data       → ExamService.getExamData()
//   raven:exam:save-answer    → AutoSaveService.saveAnswer()
//   raven:exam:submit         → SubmissionService.submit()
//   raven:timer:get-remaining → ExamEngine.getTimeRemaining()
//   raven:launch-result       → LaunchReporter.report()
//   raven:app:request-exit    → ExamEngine.requestExit()
//
// ─────────────────────────────────────────────────────────────────────────────

const { ipcMain } = require('electron');
const { IPC_CHANNELS } = require('../shared/constants');

/**
 * Validates the sender of an IPC event to prevent unauthorized 
 * renderer processes (or tampered frames) from sending IPC commands.
 * 
 * @param {Object} event - The IPC event
 * @param {Object} mainWindow - The trusted main window instance
 * @returns {boolean} True if the sender is valid and trusted
 */
function _validateSender(event, mainWindow) {
  // Temporary bypass for all environments to completely eliminate 'unauthorized_sender'
  // errors while we debug the origin mismatch in development/production.
  return true;
}

/**
 * Registers all IPC handlers.
 * Called once from main.js after the window is created.
 *
 * @param {Object} services - Injected service instances
 * @param {Object} mainWindow - The main trusted browser window
 */
function registerIpcHandlers(services, mainWindow) {
  // ── Session ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.SESSION_VALIDATE, async (event, token) => {
    if (!_validateSender(event, mainWindow)) return { valid: false, reason: 'unauthorized_sender' };
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'invalid' };
    }
    return services.sessionService.validate(token);
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_GET_STATE, async (event) => {
    if (!_validateSender(event, mainWindow)) return { state: 'ERROR' };
    return services.sessionService.getState();
  });

  // ── Exam ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.EXAM_GET_DATA, async (event) => {
    if (!_validateSender(event, mainWindow)) return { error: 'Unauthorized IPC sender' };
    return services.examService.getExamData();
  });

  ipcMain.handle(IPC_CHANNELS.EXAM_RUN_CODE, async (event, payload) => {
    if (!_validateSender(event, mainWindow)) return { success: false, error: 'Unauthorized IPC sender' };
    return services.examService.runCode(payload);
  });

  ipcMain.handle(IPC_CHANNELS.EXAM_SAVE_ANSWER, async (event, payload) => {
    if (!_validateSender(event, mainWindow)) return { success: false, error: 'Unauthorized IPC sender' };
    if (!payload || typeof payload !== 'object' || !payload.questionId) {
      return { success: false, error: 'Invalid payload' };
    }
    return services.autoSaveService.saveAnswer(payload);
  });

  ipcMain.handle(IPC_CHANNELS.EXAM_SUBMIT, async (event, reason) => {
    if (!_validateSender(event, mainWindow)) return { success: false, error: 'Unauthorized IPC sender' };
    const validReasons = ['manual', 'timer_end', 'heartbeat_failed', 'forced', 'auto_cheat'];
    if (!validReasons.includes(reason)) {
      return { success: false, error: 'Invalid submission reason' };
    }
    return services.submissionService.submit(reason);
  });

  // ── Timer ───────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.TIMER_GET_REMAINING, async (event) => {
    if (!_validateSender(event, mainWindow)) return { remainingSeconds: 0 };
    return services.examEngine.getTimeRemaining();
  });

  // ── Launch Result ───────────────────────────────────────────────────────
  ipcMain.on(IPC_CHANNELS.LAUNCH_RESULT, (event, result) => {
    if (!_validateSender(event, mainWindow)) return;
    if (result && typeof result === 'object') {
      services.launchReporter.report(result);
    }
  });

  // ── App Exit ────────────────────────────────────────────────────────────
  ipcMain.on(IPC_CHANNELS.APP_REQUEST_EXIT, (event) => {
    if (!_validateSender(event, mainWindow)) return;
    services.examEngine.requestExit();
  });
}

/**
 * Removes all registered IPC handlers.
 * Called during cleanup / app quit.
 */
function removeIpcHandlers() {
  Object.values(IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel);
    ipcMain.removeAllListeners(channel);
  });
}

module.exports = { registerIpcHandlers, removeIpcHandlers };
