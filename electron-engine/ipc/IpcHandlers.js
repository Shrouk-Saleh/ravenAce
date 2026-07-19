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
 * Registers all IPC handlers.
 * Called once from main.js after the window is created.
 *
 * @param {Object} services - Injected service instances
 * @param {Object} services.sessionService
 * @param {Object} services.examService
 * @param {Object} services.autoSaveService
 * @param {Object} services.submissionService
 * @param {Object} services.examEngine
 * @param {Object} services.launchReporter
 */
function registerIpcHandlers(services) {
  // ── Session ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.SESSION_VALIDATE, async (_event, token) => {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'invalid' };
    }
    return services.sessionService.validate(token);
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_GET_STATE, async () => {
    return services.sessionService.getState();
  });

  // ── Exam ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.EXAM_GET_DATA, async () => {
    return services.examService.getExamData();
  });

  ipcMain.handle(IPC_CHANNELS.EXAM_RUN_CODE, async (_event, payload) => {
    return services.examService.runCode(payload);
  });

  ipcMain.handle(IPC_CHANNELS.EXAM_SAVE_ANSWER, async (_event, payload) => {
    if (!payload || typeof payload !== 'object' || !payload.questionId) {
      return { success: false, error: 'Invalid payload' };
    }
    return services.autoSaveService.saveAnswer(payload);
  });

  ipcMain.handle(IPC_CHANNELS.EXAM_SUBMIT, async (_event, reason) => {
    const validReasons = ['manual', 'timer_end', 'heartbeat_failed', 'forced', 'auto_cheat'];
    if (!validReasons.includes(reason)) {
      return { success: false, error: 'Invalid submission reason' };
    }
    return services.submissionService.submit(reason);
  });

  // ── Timer ───────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.TIMER_GET_REMAINING, async () => {
    return services.examEngine.getTimeRemaining();
  });

  // ── Launch Result ───────────────────────────────────────────────────────
  ipcMain.on(IPC_CHANNELS.LAUNCH_RESULT, (_event, result) => {
    if (result && typeof result === 'object') {
      services.launchReporter.report(result);
    }
  });

  // ── App Exit ────────────────────────────────────────────────────────────
  ipcMain.on(IPC_CHANNELS.APP_REQUEST_EXIT, () => {
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
