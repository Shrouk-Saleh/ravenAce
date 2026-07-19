// ─────────────────────────────────────────────────────────────────────────────
// core/security/FocusMonitor.js — Window Focus Monitoring
// ─────────────────────────────────────────────────────────────────────────────
//
// Monitors if the user clicks away from the exam window (loses focus).
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
  }

  start() {
    if (this.isRunning) return;
    
    // config.blur defaults to true if not explicitly false
    if (this.config.blur !== false) {
      this.mainWindow.on('blur', this._handleBlur);
    }
    
    this.mainWindow.on('focus', this._handleFocus);
    this.mainWindow.on('leave-full-screen', this._handleLeaveFullScreen);
    this.isRunning = true;
    console.log('[FocusMonitor] Started.');
  }

  stop() {
    if (!this.isRunning) return;
    
    this.mainWindow.removeListener('blur', this._handleBlur);
    this.mainWindow.removeListener('focus', this._handleFocus);
    this.mainWindow.removeListener('leave-full-screen', this._handleLeaveFullScreen);
    this.isRunning = false;
    console.log('[FocusMonitor] Stopped.');
  }

  _handleBlur() {
    this.reportViolation({
      eventType: 'focus_lost',
      severity: 'critical',
      metadata: { description: 'Exam window lost focus. Auto-submitting.' }
    });

    // Attempt to restore focus (may be ignored by OS depending on what stole focus)
    if (this.mainWindow && !this.mainWindow.isDestroyed() && !this.mainWindow.isFocused()) {
      this.mainWindow.focus();
    }
  }

  _handleFocus() {
    // We could log when focus returns if needed, but usually we just care about loss.
  }

  _handleLeaveFullScreen() {
    this.reportViolation({
      eventType: 'fullscreen_exited',
      severity: 'critical',
      metadata: { description: 'Exam window exited full-screen mode. Auto-submitting.' }
    });

    // Attempt to force it back to full-screen
    if (this.mainWindow && !this.mainWindow.isDestroyed() && !this.mainWindow.isFullScreen()) {
      this.mainWindow.setFullScreen(true);
    }
  }
}

module.exports = FocusMonitor;
