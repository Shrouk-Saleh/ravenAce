// ─────────────────────────────────────────────────────────────────────────────
// core/security/SecurityManager.js — Orchestrator for all monitors
// ─────────────────────────────────────────────────────────────────────────────
//
// Initializes all monitors, listens to their evidence reports, routes them to
// the backend, and feeds them into the SecurityRiskEngine.
// ─────────────────────────────────────────────────────────────────────────────

const FocusMonitor = require('./FocusMonitor');
const DisplayMonitor = require('./DisplayMonitor');
const InputMonitor = require('./InputMonitor');
const ProcessMonitor = require('./ProcessMonitor');
const ScreenRecordingDetector = require('./ScreenRecordingDetector');
const VmDetector = require('./VmDetector');
const AntiDebugMonitor = require('./AntiDebugMonitor');
const NetworkMonitor = require('./NetworkMonitor');
const KioskManager = require('./KioskManager');
const SecurityRiskEngine = require('./SecurityRiskEngine');
const { app } = require('electron');

class SecurityManager {
  /**
   * @param {Object} mainWindow
   * @param {Object} services - The services map
   * @param {Object} policy - The full securityPolicy.json
   */
  constructor(mainWindow, services, policy) {
    this.mainWindow = mainWindow;
    this.services = services;
    this.policy = policy;
    
    this.monitors = [];
    this._offlineQueue = [];
    this._isFlushing = false;
    
    // Instantiate the Risk Engine
    this.riskEngine = new SecurityRiskEngine(this.policy.riskEngine || {});
    this.riskEngine.on('riskLevelChanged', this._handleRiskLevelChange.bind(this));

    this._processMonitor = null;
    this._vmDetector = new VmDetector();
    
    this._handleEvidence = this._handleEvidence.bind(this);
    this._initializeMonitors();
  }

  _initializeMonitors() {
    if (this.policy.features.focusTracking) {
      this.monitors.push(new FocusMonitor(this.mainWindow, { ...this.policy.focus, violations: this.policy.violations }));
    }
    
    if (this.policy.features.displayTracking) {
      this.monitors.push(new DisplayMonitor(this.policy.display));
    }
    
    if (this.policy.features.inputBlocking) {
      this.monitors.push(new InputMonitor(this.mainWindow, this.policy.input));
    }
    
    if (this.policy.features.processScanning) {
      this._processMonitor = new ProcessMonitor(this.policy.process);
      this.monitors.push(this._processMonitor);
    }

    if (this.policy.features.screenRecordingDetection) {
      this.monitors.push(new ScreenRecordingDetector(this.policy.process));
    }

    if (this.policy.features.antiDebugging) {
      this.monitors.push(new AntiDebugMonitor(this.policy.antiDebugging));
    }

    if (this.policy.features.networkMonitoring) {
      this.monitors.push(new NetworkMonitor(this.policy.network));
    }

    if (this.policy.features.strictKiosk) {
      this.monitors.push(new KioskManager(this.policy.kiosk));
    }

    // Bind the unified evidence handler to all monitors
    this.monitors.forEach(monitor => {
      monitor.onEvidence(this._handleEvidence);
    });
  }

  /**
   * Run preflight security checks BEFORE the exam starts.
   */
  async runPreflightChecks() {
    console.log('[SecurityManager] Running preflight security checks...');
    const results = { passed: true, reason: null, details: {} };

    // ── 1. VM Detection ──────────────────────────────────────────────────
    if (this.policy.features.vmDetection) {
      try {
        const threshold = this.policy.process.vmConfidenceThreshold || 60;
        const vmResult = await this._vmDetector.detect(threshold);
        results.details.vm = vmResult;

        if (vmResult.detected && this.policy.process.blockOnVm) {
          results.passed = false;
          results.reason = `Virtual machine detected: ${vmResult.indicators.join(', ')}. Exams cannot be taken inside virtual machines.`;
          console.error(`[SecurityManager] PREFLIGHT FAILED: VM detected with score ${vmResult.score}`);
          return results;
        } else if (vmResult.detected) {
          console.warn(`[SecurityManager] VM detected but blockOnVm is disabled.`);
        }
      } catch (err) {
        console.error(`[SecurityManager] VM detection error: ${err.message}`);
      }
    }

    // ── 2. Kill all forbidden processes ──────────────────────────────────
    if (this.policy.features.processScanning && this._processMonitor) {
      try {
        const killedProcesses = await this._processMonitor.runPreflightScan();
        results.details.killedProcesses = killedProcesses;
        if (killedProcesses.length > 0) {
          console.warn(`[SecurityManager] Preflight killed ${killedProcesses.length} forbidden processes.`);
        }
      } catch (err) {
        console.error(`[SecurityManager] Preflight process scan error: ${err.message}`);
      }
    }

    return results;
  }

  startAll() {
    console.log('[SecurityManager] Starting all monitors...');
    this.monitors.forEach(monitor => monitor.start());
  }

  stopAll() {
    console.log('[SecurityManager] Stopping all monitors...');
    this.monitors.forEach(monitor => monitor.stop());
    this.riskEngine.stopDecay();
  }

  /**
   * Unified evidence handler.
   */
  async _handleEvidence(evidence) {
    // Feed into Risk Engine
    this.riskEngine.processEvidence(evidence);
    
    // Log to backend
    this._logToBackend(evidence);
  }

  /**
   * Responds to changes in the overall Risk Level.
   */
  _handleRiskLevelChange({ previousLevel, newLevel, score, triggeringEvidence }) {
    console.warn(`[SecurityManager] Risk Level Changed: ${previousLevel} -> ${newLevel} (Score: ${score})`);

    // Alert the UI
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('raven:security:violation-warning', {
        message: `Security Risk Level increased to ${newLevel} (Score: ${score}). ${triggeringEvidence.metadata?.description || ''}`,
        severity: newLevel.toLowerCase(),
        eventType: triggeringEvidence.type || 'risk_increase'
      });
    }

    // Enforce Critical threshold
    if (false /* temporarily disabled for dev */) {
      console.error('[SecurityManager] CRITICAL risk threshold reached. Forcing submission.');
      this._forceSubmit('auto_cheat');
    }
  }

  // ── Logging & Queueing ──────────────────────────────────────────────────

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

    for (const evidence of queueCopy) {
      try {
        await this.services.httpClient.post('/api/secure-session/event', {
          attemptId: state.attemptId,
          eventType: evidence.type,
          severity: evidence.severity,
          source: evidence.source,
          violationId: evidence.evidenceId, // Map evidenceId to violationId for backend compat
          timestamp: evidence.timestamp,
          metadata: {
            ...evidence.metadata,
            riskScore: this.riskEngine.getCurrentState().score
          }
        });
      } catch (err) {
        if (err.isNetworkError || (err.status && err.status >= 500)) {
          failedAgain.push(evidence);
        } else {
          console.warn(`[SecurityManager] Dropping evidence ${evidence.type} due to permanent 4xx error:`, err.message);
        }
      }
    }

    this._offlineQueue = [...failedAgain, ...this._offlineQueue.slice(queueCopy.length)];
    this._isFlushing = false;
  }

  async _logToBackend(evidence) {
    try {
      const state = this.services.sessionService.getState();
      if (!state.attemptId) return;

      await this.services.httpClient.post('/api/secure-session/event', {
        attemptId: state.attemptId,
        eventType: evidence.type,
        severity: evidence.severity,
        source: evidence.source,
        violationId: evidence.evidenceId,
        timestamp: evidence.timestamp,
        metadata: {
          ...evidence.metadata,
          riskScore: this.riskEngine.getCurrentState().score
        }
      });

      this._flushQueue();
    } catch (err) {
      console.warn('[SecurityManager] Network failed. Queueing evidence offline.');
      const maxBuffer = this.policy.autoSave?.maxOfflineBuffer || 50;
      if (this._offlineQueue.length >= maxBuffer) {
        this._offlineQueue.shift(); // Drop oldest
      }
      this._offlineQueue.push(evidence);
    }
  }

  async _forceSubmit(reason) {
    this.stopAll();
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('raven:exam:forced-submit', { reason });
    }

    try {
      await this.services.submissionService.submit(reason);
      setTimeout(() => { app.quit(); }, 5000);
    } catch (err) {
      console.error('[SecurityManager] Forced submission failed:', err.message);
      app.quit();
    }
  }
}

module.exports = SecurityManager;
