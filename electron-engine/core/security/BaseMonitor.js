// ─────────────────────────────────────────────────────────────────────────────
// core/security/BaseMonitor.js — Abstract Monitor Class
// ─────────────────────────────────────────────────────────────────────────────
//
// All specific security monitors must inherit from this class and implement
// start() and stop() methods.
// ─────────────────────────────────────────────────────────────────────────────

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
   * Register a callback to be invoked when this monitor detects a violation.
   * @param {function(Object): void} callback
   */
  onViolation(callback) {
    if (typeof callback === 'function') {
      this.callbacks.push(callback);
    }
  }

  /**
   * Internal method called by subclasses to report a detected violation.
   * @param {Object} eventData
   * @param {string} eventData.eventType - e.g. 'focus_lost', 'forbidden_process'
   * @param {string} eventData.severity - 'low', 'medium', 'high', 'critical'
   * @param {Object} eventData.metadata - Additional context
   * @protected
   */
  reportViolation(eventData) {
    const violation = {
      source: this.name,
      timestamp: Date.now(),
      ...eventData,
    };
    
    for (const callback of this.callbacks) {
      callback(violation);
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
