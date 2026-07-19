// ─────────────────────────────────────────────────────────────────────────────
// core/security/ProcessMonitor.js — Blacklisted Process Scanner
// ─────────────────────────────────────────────────────────────────────────────
//
// Periodically scans the host OS for forbidden processes (e.g., OBS, TeamViewer).
// ─────────────────────────────────────────────────────────────────────────────

const BaseMonitor = require('./BaseMonitor');
const { exec } = require('child_process');
const os = require('os');
const forbiddenProcesses = require('../../config/forbiddenProcesses.json');

class ProcessMonitor extends BaseMonitor {
  /**
   * @param {Object} config - Policy configuration for this monitor
   */
  constructor(config) {
    super('ProcessMonitor');
    this.config = config;
    this.scanInterval = null;
    this.platform = os.platform();
    this.blacklist = this._buildBlacklist();
  }

  _buildBlacklist() {
    const list = new Map(); // Map name -> severity
    if (forbiddenProcesses.processes) {
      forbiddenProcesses.processes.forEach(proc => {
        if (proc.platform === this.platform && proc.name) {
          list.set(proc.name.toLowerCase(), proc.severity || 'high');
        }
      });
    }
    return list;
  }

  start() {
    if (this.isRunning) return;
    
    // Convert seconds to ms
    const intervalMs = (this.config.intervalSeconds || 10) * 1000;
    
    this.scanInterval = setInterval(() => {
      this._scan();
    }, intervalMs);

    // Initial scan
    this._scan();
    
    this.isRunning = true;
    console.log('[ProcessMonitor] Started.');
  }

  stop() {
    if (!this.isRunning) return;
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    this.isRunning = false;
    console.log('[ProcessMonitor] Stopped.');
  }

  _scan() {
    if (this.platform === 'win32') {
      this._scanWindows();
    } else if (this.platform === 'darwin') {
      this._scanMac();
    } else {
      // Linux not fully supported yet in this snippet, but could use 'ps -A'
      console.warn('[ProcessMonitor] Unsupported platform for process scanning.');
    }
  }

  _scanWindows() {
    // tasklist /NH /FO CSV returns: "Image Name","PID","Session Name","Session#","Mem Usage"
    exec('tasklist /NH /FO CSV', (error, stdout) => {
      if (error) {
        console.error(`[ProcessMonitor] tasklist error: ${error.message}`);
        return;
      }
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        // Extract process name (first CSV column)
        const parts = line.split('","');
        if (parts.length > 0) {
          let processName = parts[0].replace('"', '').toLowerCase();
          
          if (this.blacklist.has(processName)) {
            const severity = this.blacklist.get(processName);
            this._handleForbiddenProcess(processName, severity);
            // Don't report same process 100 times per scan
            break; 
          }
        }
      }
    });
  }

  _scanMac() {
    // ps -Ao comm= returns just the command paths
    exec('ps -Ao comm=', (error, stdout) => {
      if (error) {
        console.error(`[ProcessMonitor] ps error: ${error.message}`);
        return;
      }
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Extract the executable name from the path
        const processName = line.trim().split('/').pop().toLowerCase();
        
        if (this.blacklist.has(processName)) {
          const severity = this.blacklist.get(processName);
          this._handleForbiddenProcess(processName, severity);
          break;
        }
      }
    });
  }

  _handleForbiddenProcess(processName, severity) {
    this.reportViolation({
      eventType: 'forbidden_process',
      severity: severity || 'critical',
      metadata: { 
        description: `Forbidden process detected running: ${processName}`,
        processName: processName
      }
    });
  }
}

module.exports = ProcessMonitor;
