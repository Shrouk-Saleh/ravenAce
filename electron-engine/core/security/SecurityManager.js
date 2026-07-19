// ─────────────────────────────────────────────────────────────────────────────
// core/security/SecurityManager.js — Orchestrator for all monitors
// ─────────────────────────────────────────────────────────────────────────────
//
// Initializes all monitors, listens to their violations, routes them to the
// backend, and decides if the exam should be forced-submitted based on policy.
// ─────────────────────────────────────────────────────────────────────────────

const FocusMonitor = require('./FocusMonitor');
const DisplayMonitor = require('./DisplayMonitor');
const InputMonitor = require('./InputMonitor');
const ProcessMonitor = require('./ProcessMonitor');
const { app } = require('electron');

class SecurityManager {
  /**
   * @param {Object} mainWindow
   * @param {Object} services - The services map (must include httpClient & submissionService)
   * @param {Object} policy - The full securityPolicy.json
   */
  constructor(mainWindow, services, policy) {
    this.mainWindow = mainWindow;
    this.services = services;
    this.policy = policy;
    
    this.monitors = [];
    this._offlineQueue = [];
    this._isFlushing = false;
    this.violationCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    this._handleViolation = this._handleViolation.bind(this);
    this._initializeMonitors();
  }

  _initializeMonitors() {
    if (this.policy.features.focusTracking) {
      this.monitors.push(new FocusMonitor(this.mainWindow, this.policy.focus));
    }
    
    if (this.policy.features.displayTracking) {
      this.monitors.push(new DisplayMonitor(this.policy.display));
    }
    
    if (this.policy.features.inputBlocking) {
      this.monitors.push(new InputMonitor(this.mainWindow, this.policy.input));
    }
    
    if (this.policy.features.processScanning) {
      this.monitors.push(new ProcessMonitor(this.policy.process));
    }

    // Bind the unified handler to all monitors
    this.monitors.forEach(monitor => {
      monitor.onViolation(this._handleViolation);
    });
  }

  startAll() {
    console.log('[SecurityManager] Starting all monitors...');
    this.monitors.forEach(monitor => monitor.start());
  }

  stopAll() {
    console.log('[SecurityManager] Stopping all monitors...');
    this.monitors.forEach(monitor => monitor.stop());
  }

  /**
   * Unified violation handler.
   * 1. Logs to backend
   * 2. Sends warning to Renderer (UI Toast)
   * 3. Evaluates strike policy
   */
  async _handleViolation(violation) {
    console.warn(`[SecurityManager] VIOLATION DETECTED [${violation.severity}]: ${violation.eventType}`);
    
    this.violationCounts[violation.severity]++;
    
    // 1. Log to backend via REST API (which creates a CheatLog document)
    // We don't await this because we don't want a slow network to delay the UI reaction
    this._logToBackend(violation);

    // 2. Alert the student via the React UI
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('raven:security:violation-warning', {
        message: violation.metadata?.description || `Violation: ${violation.eventType}`
      });
    }

    // 3. Evaluate limits
    this._evaluatePolicy(violation.severity);
  }

  async _flushQueue() {
    if (this._isFlushing || this._offlineQueue.length === 0) return;
    this._isFlushing = true;
    const state = this.services.sessionService.getState();
    if (!state.attemptId) {
      this._isFlushing = false;
      return;
    }

    const queueCopy = [...this._offlineQueue];
    const failedAgain = [];

    for (const violation of queueCopy) {
      try {
        await this.services.httpClient.post('/api/secure-session/event', {
          attemptId: state.attemptId,
          eventType: violation.eventType,
          severity: violation.severity,
          metadata: violation.metadata
        });
      } catch (err) {
        // Only keep the violation in the offline queue if it's a network error or a 5xx server error
        if (err.isNetworkError || (err.status && err.status >= 500)) {
          failedAgain.push(violation);
        } else {
          console.warn(`[SecurityManager] Dropping violation ${violation.eventType} due to permanent 4xx error:`, err.message);
        }
      }
    }

    // Merge the failed events back, but KEEP any new events that were pushed 
    // to this._offlineQueue while we were awaiting the network requests above.
    this._offlineQueue = [...failedAgain, ...this._offlineQueue.slice(queueCopy.length)];
    this._isFlushing = false;
  }

  async _logToBackend(violation) {
    try {
      // Set timestamp if not present to preserve original time
      if (!violation.metadata) violation.metadata = {};
      if (!violation.metadata.timestamp) violation.metadata.timestamp = Date.now();

      // The sessionService holds the attemptId. If it's missing, we can't log.
      const state = this.services.sessionService.getState();
      if (!state.attemptId) return;

      await this.services.httpClient.post('/api/secure-session/event', {
        attemptId: state.attemptId,
        eventType: violation.eventType,
        severity: violation.severity,
        metadata: violation.metadata
      });

      // If successful, try flushing any queued offline events
      this._flushQueue();
    } catch (err) {
      console.warn('[SecurityManager] Network failed. Queueing violation offline.');
      const maxBuffer = this.policy.autoSave?.maxOfflineBuffer || 50;
      if (this._offlineQueue.length >= maxBuffer) {
        console.warn('[SecurityManager] Offline queue full. Dropping oldest event.');
        this._offlineQueue.shift(); // Drop oldest
      }
      this._offlineQueue.push(violation);
    }
  }

  _evaluatePolicy(triggeredSeverity) {
    // If a critical violation occurs, we auto-submit immediately (e.g. OBS detected)
    if (triggeredSeverity === 'critical') {
      console.error('[SecurityManager] Critical violation. Forcing submission.');
      this._forceSubmit('auto_cheat');
      return;
    }

    // Check strike limits for other severities
    const limits = this.policy.strikes.limits;
    
    if (this.violationCounts.high >= limits.high) {
      console.error('[SecurityManager] High violation limit reached. Forcing submission.');
      this._forceSubmit('auto_cheat');
      return;
    }

    if (this.violationCounts.medium >= limits.medium) {
      console.error('[SecurityManager] Medium violation limit reached. Forcing submission.');
      this._forceSubmit('auto_cheat');
      return;
    }

    // Low violations usually just warn, but we can set a high threshold (e.g. 10 copy attempts)
    if (this.violationCounts.low >= limits.low) {
      console.error('[SecurityManager] Low violation limit reached. Forcing submission.');
      this._forceSubmit('auto_cheat');
      return;
    }
  }

  async _forceSubmit(reason) {
    this.stopAll();
    
    // Notify renderer that the exam is being forcefully submitted
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('raven:exam:forced-submit', { reason });
    }

    try {
      await this.services.submissionService.submit(reason);
      
      // Give the UI a few seconds to show the "Exam Terminated" message before closing
      setTimeout(() => {
        app.quit();
      }, 5000);
      
    } catch (err) {
      console.error('[SecurityManager] Forced submission failed:', err.message);
      // Even if the network submission fails, we must exit the app because it's compromised
      app.quit();
    }
  }
}

module.exports = SecurityManager;
