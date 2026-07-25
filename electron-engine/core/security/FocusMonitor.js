// ─────────────────────────────────────────────────────────────────────────────
// core/security/FocusMonitor.js — Window Focus Monitoring & Kiosk Enforcement
// ─────────────────────────────────────────────────────────────────────────────
//
// Monitors if the user clicks away from the exam window (loses focus).
// Enhanced with aggressive focus reclaim, kiosk mode re-enforcement, and
// a periodic focus check interval that forcefully reclaims focus if lost.
// ─────────────────────────────────────────────────────────────────────────────

const BaseMonitor = require('./BaseMonitor');
const { app } = require('electron');

class FocusMonitor extends BaseMonitor {
  /**
   * @param {Object} mainWindow - The main Electron window
   * @param {Object} config - Policy configuration for this monitor
   */
  constructor(mainWindow, config) {
    super('FocusMonitor');
    this.mainWindow = mainWindow;
    this.config = config;
    this._handleBlur = this._handleBlur.bind(this);
    this._handleFocus = this._handleFocus.bind(this);
    this._handleLeaveFullScreen = this._handleLeaveFullScreen.bind(this);
    this._handleMinimize = this._handleMinimize.bind(this);
    this._focusReclaimInterval = null;
  }

  start() {
    if (this.isRunning) return;
    
    // config.blur defaults to true if not explicitly false
    if (this.config.blur !== false) {
      this.mainWindow.on('blur', this._handleBlur);
    }
    
    this.mainWindow.on('focus', this._handleFocus);
    this.mainWindow.on('leave-full-screen', this._handleLeaveFullScreen);
    this.mainWindow.on('minimize', this._handleMinimize);

    // Start periodic focus reclaim check
    const reclaimIntervalMs = (this.config.reclaimIntervalSeconds || 2) * 1000;
    this._focusReclaimInterval = setInterval(() => {
      this._enforceFocusAndKiosk();
    }, reclaimIntervalMs);

    // Enforce initial kiosk state
    this._enforceFocusAndKiosk();

    this.isRunning = true;
    console.log(`[FocusMonitor] Started. Focus reclaim every ${reclaimIntervalMs / 1000}s.`);
  }

  stop() {
    if (!this.isRunning) return;
    
    this.mainWindow.removeListener('blur', this._handleBlur);
    this.mainWindow.removeListener('focus', this._handleFocus);
    this.mainWindow.removeListener('leave-full-screen', this._handleLeaveFullScreen);
    this.mainWindow.removeListener('minimize', this._handleMinimize);

    if (this._focusReclaimInterval) {
      clearInterval(this._focusReclaimInterval);
      this._focusReclaimInterval = null;
    }

    this.isRunning = false;
    console.log('[FocusMonitor] Stopped.');
  }

  _handleBlur() {
    this.reportEvidence({
      type: 'focus_lost',
      severity: this.config.violations?.focusLost?.severity || 'medium',
      metadata: { description: 'Exam window lost focus.' }
    });

    // Aggressively attempt to restore focus
    this._reclaimFocus();
  }

  _handleFocus() {
    // Ensure kiosk mode is still active when we regain focus
    this._enforceKiosk();
  }

  _handleLeaveFullScreen() {
    this.reportEvidence({
      type: 'fullscreen_exited',
      severity: this.config.violations?.fullscreenExited?.severity || 'high',
      metadata: { description: 'Exam window exited full-screen mode.' }
    });

    // Immediately re-enter fullscreen and kiosk
    this._enforceKiosk();
  }

  _handleMinimize() {
    this.reportEvidence({
      type: 'window_minimized',
      severity: this.config.violations?.windowMinimized?.severity || 'low',
      metadata: { description: 'Exam window was minimized.' }
    });

    // Restore from minimize immediately
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.restore();
      this._reclaimFocus();
    }
  }

  /**
   * Aggressively reclaim focus for the exam window.
   */
  _reclaimFocus() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    try {
      // Restore if minimized
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }

      // Set always on top with the highest level
      this.mainWindow.setAlwaysOnTop(true, 'screen-saver');

      // Focus the window
      this.mainWindow.focus();

      // On Windows, also try to bring to front more aggressively
      this.mainWindow.moveTop();

      // Show the window if it's somehow hidden
      if (!this.mainWindow.isVisible()) {
        this.mainWindow.show();
      }
    } catch (err) {
      console.error(`[FocusMonitor] Error reclaiming focus: ${err.message}`);
    }
  }

  /**
   * Ensure the window is in kiosk mode and fullscreen.
   */
  _enforceKiosk() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    try {
      if (!this.mainWindow.isKiosk()) {
        this.mainWindow.setKiosk(true);
      }
      if (!this.mainWindow.isFullScreen()) {
        this.mainWindow.setFullScreen(true);
      }
      if (!this.mainWindow.isAlwaysOnTop()) {
        this.mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    } catch (err) {
      console.error(`[FocusMonitor] Error enforcing kiosk: ${err.message}`);
    }
  }

  /**
   * Periodic check that combines focus reclaim and kiosk enforcement.
   * This is the safety net — if anything somehow breaks focus or kiosk,
   * this will catch it within a few seconds.
   */
  _enforceFocusAndKiosk() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    try {
      // Enforce kiosk mode
      this._enforceKiosk();

      // If the window doesn't have focus, reclaim it
      if (!this.mainWindow.isFocused()) {
        this._reclaimFocus();
      }
    } catch (err) {
      console.error(`[FocusMonitor] Error in periodic enforcement: ${err.message}`);
    }
  }
}

module.exports = FocusMonitor;
