// ─────────────────────────────────────────────────────────────────────────────
// core/security/BaseMonitor.js — Abstract Monitor Class
// ─────────────────────────────────────────────────────────────────────────────
//
// All specific security monitors must inherit from this class and implement
// start() and stop() methods.
//
// Every violation gets a unique violationId for audit trail cross-referencing.
// ─────────────────────────────────────────────────────────────────────────────

const { randomUUID } = require('crypto');
const os = require('os');

class BaseMonitor {
  constructor(name) {
    if (new.target === BaseMonitor) {
      throw new TypeError("Cannot construct BaseMonitor instances directly");
    }
    this.name = name;
    this.callbacks = [];
    this.isRunning = false;
  }

  /**
   * Register a callback to be invoked when this monitor detects evidence of risk.
   * @param {function(Object): void} callback
   */
  onEvidence(callback) {
    if (typeof callback === 'function') {
      this.callbacks.push(callback);
    }
  }

  /**
   * Internal method called by subclasses to report detected evidence of risk.
   * Automatically enriches with evidenceId, source, timestamp, and user.
   *
   * @param {Object} eventData
   * @param {string} eventData.type - e.g. 'forbidden_process', 'timing_anomaly'
   * @param {string} eventData.severity - 'low', 'medium', 'high', 'critical'
   * @param {number} [eventData.confidence] - 0.0 to 1.0 (defaults to 1.0)
   * @param {number} [eventData.scoreOverride] - Direct point value override
   * @param {Object} eventData.metadata - Additional context/evidence details
   * @protected
   */
  reportEvidence(eventData) {
    if (!eventData.metadata) eventData.metadata = {};
    if (!eventData.metadata.timestamp) eventData.metadata.timestamp = Date.now();
    if (!eventData.metadata.user) {
      try { eventData.metadata.user = os.userInfo().username; } catch (e) { /* ignore */ }
    }

    const evidence = {
      evidenceId: randomUUID(),
      source: this.name,
      timestamp: Date.now(),
      confidence: 1.0, // Default
      ...eventData,
    };
    
    for (const callback of this.callbacks) {
      callback(evidence);
    }
  }

  /**
   * Abstract start method. Subclasses must implement this.
   */
  start() {
    throw new Error(`Monitor ${this.name} must implement start()`);
  }

  /**
   * Abstract stop method. Subclasses must implement this.
   */
  stop() {
    throw new Error(`Monitor ${this.name} must implement stop()`);
  }
}

module.exports = BaseMonitor;
