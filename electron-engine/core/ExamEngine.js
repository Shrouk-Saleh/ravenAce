// ─────────────────────────────────────────────────────────────────────────────
// core/ExamEngine.js — Main Process Orchestrator
// ─────────────────────────────────────────────────────────────────────────────
//
// Wires everything together: Services, IPC, Window Lifecycle, and Security.
// Handles transitioning the app from "launching" to "active exam" to "exiting".
// ─────────────────────────────────────────────────────────────────────────────

const { app } = require('electron');
const { registerIpcHandlers, removeIpcHandlers } = require('../ipc/IpcHandlers');

class ExamEngine {
  /**
   * @param {Object} mainWindow - The secure BrowserWindow instance
   * @param {Object} services - The injected services map
   */
  constructor(mainWindow, services) {
    this.mainWindow = mainWindow;
    this.services = services;
    this.examStartTime = null;
    this.durationMinutes = null;
    this._timerInterval = null;
    this.isExiting = false;
  }

  /**
   * Initialize the engine and wire up IPC.
   */
  start() {
    console.log('[ExamEngine] Starting engine...');
    
    // Inject ExamEngine reference into services map so handlers can call it
    this.services.examEngine = this;
    
    // Wire up the IPC bridge
    registerIpcHandlers(this.services);

    // Expose a method on SessionService so we know when token is validated
    const originalValidate = this.services.sessionService.validate.bind(this.services.sessionService);
    this.services.sessionService.validate = async (token) => {
      const result = await originalValidate(token);
      if (result.valid) {
        this._onSessionValidated();
      }
      return result;
    };
  }

  /**
   * Called internally when the token validation succeeds.
   * Starts the heartbeat and locks down the environment.
   */
  _onSessionValidated() {
    console.log('[ExamEngine] Session validated. Locking down environment.');
    
    // Start heartbeat
    this.services.sessionGuardian.start();

    // Fetch initial exam data to set up timers
    this.services.examService.getExamData().then(examData => {
      if (examData && examData.exam && examData.exam.duration) {
        this.durationMinutes = examData.exam.duration;
        const timeAlreadySpent = examData.startedAt ? Date.now() - new Date(examData.startedAt).getTime() : 0;
        this.examStartTime = Date.now() - timeAlreadySpent;
      }
    }).catch(err => {
      console.error('[ExamEngine] Failed to fetch exam data for setup:', err.message);
    });

    // Start all security monitors
    if (this.services.securityManager) {
      this.services.securityManager.startAll();
    }

    // Start Main Process Timer
    this._timerInterval = setInterval(() => {
      const remainingMs = this.getTimeRemaining();
      if (remainingMs !== null && this.mainWindow && !this.mainWindow.isDestroyed()) {
        try {
          this.mainWindow.webContents.send('raven:timer:update', remainingMs / 1000);
        } catch (e) {
          console.error('[ExamEngine] Failed to send timer update:', e);
        }
      }
    }, 1000);
  }

  /**
   * Called from IPC when React app requests current time remaining.
   */
  getTimeRemaining() {
    if (!this.examStartTime || !this.durationMinutes) return null;
    
    const elapsed = Date.now() - this.examStartTime;
    const totalDurationMs = this.durationMinutes * 60 * 1000;
    const remaining = totalDurationMs - elapsed;
    
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Called from IPC when React app submits the exam or user clicks Close.
   */
  requestExit() {
    console.log('[ExamEngine] Exit requested. Cleaning up.');
    this.isExiting = true;
    
    // Stop heartbeat and security monitors
    this.services.sessionGuardian.stop();
    if (this.services.securityManager) {
      this.services.securityManager.stopAll();
    }
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    
    // Remove IPC handlers
    removeIpcHandlers();
    
    // Open results in browser before quitting
    try {
      const state = this.services.sessionService.getState();
      if (state && state.attemptId && state.state === 'SUBMITTED') {
        const { shell } = require('electron');
        const frontendUrl = process.env.RAVENACE_FRONTEND_URL || 'http://localhost:5173';
        shell.openExternal(`${frontendUrl}/results/${state.attemptId}`);
      }
    } catch(e) {
      console.error('[ExamEngine] Failed to open external results page:', e);
    }
    
    // Close the app forcefully
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.destroy(); // Force destruction to bypass any close event blockers
      }
    } catch(e) {
      console.error('[ExamEngine] Failed to destroy window:', e);
    } finally {
      app.quit();
    }
  }
}

module.exports = ExamEngine;
