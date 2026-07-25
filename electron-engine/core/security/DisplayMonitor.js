// ─────────────────────────────────────────────────────────────────────────────
// core/security/DisplayMonitor.js — Monitor Output Devices
// ─────────────────────────────────────────────────────────────────────────────
//
// Detects if the user connects a second monitor, hot-plugs displays, or
// connects via Remote Desktop (RDP) / Virtual Displays.
// ─────────────────────────────────────────────────────────────────────────────

const BaseMonitor = require('./BaseMonitor');
const { screen, app } = require('electron');
const { exec } = require('child_process');
const os = require('os');
const forbiddenProcesses = require('../../config/forbiddenProcesses.json');

class DisplayMonitor extends BaseMonitor {
  /**
   * @param {Object} config - Policy configuration for this monitor
   */
  constructor(config) {
    super('DisplayMonitor');
    this.config = config;
    if (typeof this.config.allowedMonitors !== 'number' || !Number.isFinite(this.config.allowedMonitors)) {
      throw new Error("DisplayMonitor requires a finite number for config.allowedMonitors");
    }
    this.platform = os.platform();
    this.scanInterval = null;
    
    // Bind event handlers
    this._handleDisplayAdded = this._handleDisplayAdded.bind(this);
    this._handleDisplayRemoved = this._handleDisplayRemoved.bind(this);
    this._handleDisplayMetricsChanged = this._handleDisplayMetricsChanged.bind(this);
  }

  start() {
    if (this.isRunning) return;
    
    // Initial checks on startup
    this._checkDisplays();
    if (this.config.detectRdp !== false) this._checkRdp();
    
    // Listen for display events
    screen.on('display-added', this._handleDisplayAdded);
    screen.on('display-removed', this._handleDisplayRemoved);
    screen.on('display-metrics-changed', this._handleDisplayMetricsChanged);

    // Periodic safety net checks
    const pollMs = (this.config.pollIntervalSeconds || 5) * 1000;
    this.scanInterval = setInterval(() => {
      this._checkDisplays();
      if (this.config.detectRdp !== false) this._checkRdp();
    }, pollMs);
    
    this.isRunning = true;
    console.log('[DisplayMonitor] Started.');
  }

  stop() {
    if (!this.isRunning) return;
    
    screen.removeListener('display-added', this._handleDisplayAdded);
    screen.removeListener('display-removed', this._handleDisplayRemoved);
    screen.removeListener('display-metrics-changed', this._handleDisplayMetricsChanged);
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
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
    
    this.reportEvidence({
      type: 'display_hot_plug',
      severity: 'high',
      metadata: { 
        description: `New display connected during exam. ID: ${newDisplay.id}`
      }
    });

    if (displays.length > this.config.allowedMonitors) {
      this._reportMultipleMonitors(displays.length);
    }
  }

  _handleDisplayRemoved(event, oldDisplay) {
    this.reportEvidence({
      type: 'display_removed',
      severity: 'medium',
      metadata: { 
        description: `Display removed during exam. ID: ${oldDisplay.id}`
      }
    });
  }

  _handleDisplayMetricsChanged(event, display, changedMetrics) {
    // A change in bounds/workArea without an explicit user resize often indicates
    // mirroring was toggled (e.g. projecting to another screen).
    if (changedMetrics.includes('bounds') || changedMetrics.includes('workArea')) {
      this.reportEvidence({
        type: 'display_metrics_changed',
        severity: 'medium',
        metadata: { 
          description: `Display metrics changed automatically. Possible screen mirroring/projection toggled.`,
          displayId: display.id,
          changedMetrics
        }
      });
    }
  }

  _reportMultipleMonitors(count) {
    this.reportEvidence({
      type: 'second_monitor',
      severity: 'high',
      metadata: { 
        description: `Multiple monitors detected. Found ${count}, allowed ${this.config.allowedMonitors}.`
      }
    });
  }

  /**
   * Check for active Remote Desktop sessions (Windows only).
   */
  _checkRdp() {
    if (this.platform !== 'win32') return;

    // qwinsta returns the list of remote desktop sessions
    exec('qwinsta', { windowsHide: true, timeout: 5000 }, (error, stdout) => {
      if (error) return;

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const normalized = line.toLowerCase();
        
        // Active RDP session usually looks like "rdp-tcp#0  User  Active"
        if (normalized.includes('rdp-tcp') && normalized.includes('active')) {
          this.reportEvidence({
            type: 'rdp_detected',
            severity: 'low',
            metadata: { 
              description: `Active Remote Desktop (RDP) session detected.`,
              method: 'qwinsta_check',
              sessionDetails: line.trim()
            }
          });
          break; // Report once per check
        }
      }
    });
  }
}

module.exports = DisplayMonitor;
