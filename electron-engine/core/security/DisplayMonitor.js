// ─────────────────────────────────────────────────────────────────────────────
// core/security/DisplayMonitor.js — Monitor Output Devices
// ─────────────────────────────────────────────────────────────────────────────
//
// Detects if the user connects a second monitor or tries to mirror the display.
// ─────────────────────────────────────────────────────────────────────────────

const BaseMonitor = require('./BaseMonitor');
const { screen } = require('electron');

class DisplayMonitor extends BaseMonitor {
  /**
   * @param {Object} config - Policy configuration for this monitor
   */
  constructor(config) {
    super('DisplayMonitor');
    this.config = config;
    this._handleDisplayAdded = this._handleDisplayAdded.bind(this);
  }

  start() {
    if (this.isRunning) return;
    
    // Initial check on startup
    this._checkDisplays();

    // Listen for displays being added during the session
    screen.on('display-added', this._handleDisplayAdded);
    
    this.isRunning = true;
    console.log('[DisplayMonitor] Started.');
  }

  stop() {
    if (!this.isRunning) return;
    
    screen.removeListener('display-added', this._handleDisplayAdded);
    
    this.isRunning = false;
    console.log('[DisplayMonitor] Stopped.');
  }

  _checkDisplays() {
    const displays = screen.getAllDisplays();
    if (displays.length > this.config.allowedMonitors) {
      this._reportMultipleMonitors(displays.length);
    }
  }

  _handleDisplayAdded(event, newDisplay) {
    const displays = screen.getAllDisplays();
    if (displays.length > this.config.allowedMonitors) {
      this._reportMultipleMonitors(displays.length);
    }
  }

  _reportMultipleMonitors(count) {
    this.reportViolation({
      eventType: 'second_monitor',
      severity: 'high',
      metadata: { 
        description: `Multiple monitors detected. Found ${count}, allowed ${this.config.allowedMonitors}.`
      }
    });
  }
}

module.exports = DisplayMonitor;
