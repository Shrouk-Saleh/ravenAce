// ─────────────────────────────────────────────────────────────────────────────
// core/security/ScreenRecordingDetector.js — Screen Recording Tool Detector
// ─────────────────────────────────────────────────────────────────────────────
//
// Continuous monitor that specifically targets screen recording and streaming
// software. Works alongside ProcessMonitor but focuses on the "screen_recording"
// category with enhanced detection (window title scanning on Windows).
// ─────────────────────────────────────────────────────────────────────────────

const BaseMonitor = require('./BaseMonitor');
const { exec } = require('child_process');
const os = require('os');
const forbiddenProcesses = require('../../config/forbiddenProcesses.json');

class ScreenRecordingDetector extends BaseMonitor {
  constructor(config) {
    super('ScreenRecordingDetector');
    this.config = config;
    this.platform = os.platform();
    this.scanInterval = null;
    this._alreadyDetected = new Set();

    // Build a set of screen recording process names for the current platform
    this.recorderProcesses = new Map();
    if (forbiddenProcesses.processes) {
      forbiddenProcesses.processes
        .filter(p => p.category === 'screen_recording' && p.platform === this.platform)
        .forEach(p => {
          this.recorderProcesses.set(p.name.toLowerCase(), {
            displayName: p.displayName || p.name,
            severity: p.severity || 'low'
          });
        });
    }

    // Known window title keywords that indicate active recording
    this.recordingTitleKeywords = [
      'recording', 'streaming', 'broadcasting', 'capture',
      'rec -', '● rec', '🔴', 'live', 'screen record',
      'obs', 'bandicam', 'camtasia', 'sharex', 'snagit',
      'game bar', 'game dvr', 'shadowplay'
    ];

    console.log(`[ScreenRecordingDetector] Loaded ${this.recorderProcesses.size} recorder signatures for ${this.platform}`);
  }

  start() {
    if (this.isRunning) return;

    const intervalMs = (this.config.scanIntervalSeconds || 5) * 1000;

    // Initial scan
    this._scan();

    this.scanInterval = setInterval(() => {
      this._scan();
    }, intervalMs);

    this.isRunning = true;
    console.log('[ScreenRecordingDetector] Started.');
  }

  stop() {
    if (!this.isRunning) return;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    this._alreadyDetected.clear();
    this.isRunning = false;
    console.log('[ScreenRecordingDetector] Stopped.');
  }

  _scan() {
    this.scanCount = (this.scanCount || 0) + 1;

    if (this.platform === 'win32') {
      this._scanWindowsProcesses();
      // Title scanning is secondary and easily bypassed (e.g. if OBS changes its title).
      // Run it less frequently and treat as informational.
      if (this.scanCount % 2 === 0) {
        this._scanWindowsTitles();
      }
    } else if (this.platform === 'darwin') {
      this._scanMacProcesses();
    } else {
      this._scanLinuxProcesses();
    }
  }

  /**
   * Scan running processes on Windows for known screen recorders.
   */
  _scanWindowsProcesses() {
    exec('tasklist /NH /FO CSV', { windowsHide: true }, (error, stdout) => {
      if (error) return;

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split('","');
        if (parts.length < 2) continue;

        const processName = parts[0].replace(/^"/, '').toLowerCase();

        if (this.recorderProcesses.has(processName)) {
          this._reportRecorder(processName, this.recorderProcesses.get(processName), 'process_match');

          // Kill the recorder
          if (this.config.killOnDetect !== false) {
            exec(`taskkill /F /IM "${processName}"`, { windowsHide: true }, (err) => {
              if (!err) {
                console.warn(`[ScreenRecordingDetector] KILLED recorder: ${processName}`);
              }
            });
          }
        }
      }
    });
  }

  /**
   * Scan window titles on Windows for recording indicators.
   * This catches recorders that may use non-standard process names.
   */
  _scanWindowsTitles() {
    // PowerShell command to get process names with their window titles
    const psCmd = `powershell -NoProfile -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object ProcessName, MainWindowTitle | Format-List"`;

    exec(psCmd, { windowsHide: true, timeout: 10000 }, (error, stdout) => {
      if (error) return;

      const output = stdout.toLowerCase();
      const blocks = output.split('\n\n');

      for (const block of blocks) {
        if (!block.trim()) continue;

        // Check if any recording keyword appears in the window title
        for (const keyword of this.recordingTitleKeywords) {
          if (block.includes(keyword)) {
            // Extract the process name from the block
            const nameMatch = block.match(/processname\s*:\s*(.+)/);
            const titleMatch = block.match(/mainwindowtitle\s*:\s*(.+)/);

            if (nameMatch) {
              const procName = nameMatch[1].trim();
              const title = titleMatch ? titleMatch[1].trim() : 'unknown';
              const key = `title_${procName}_${keyword}`;

              if (!this._alreadyDetected.has(key)) {
                this._alreadyDetected.add(key);

                // Clear after 60 seconds
                setTimeout(() => this._alreadyDetected.delete(key), 60000);

                this.reportEvidence({
                  type: 'screen_recorder_detected',
                  severity: 'medium', // Title matches are informational only, process matching is low
                  metadata: {
                    description: `Possible screen recording detected via window title: "${title}"`,
                    processName: procName,
                    windowTitle: title,
                    matchedKeyword: keyword,
                    method: 'window_title_scan'
                  }
                });
              }
            }
            break;
          }
        }
      }
    });
  }

  /**
   * Scan macOS for screen recording processes.
   */
  _scanMacProcesses() {
    exec('ps -Ao comm=', (error, stdout) => {
      if (error) return;

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const processName = line.trim().split('/').pop().toLowerCase();

        if (this.recorderProcesses.has(processName)) {
          this._reportRecorder(processName, this.recorderProcesses.get(processName), 'process_match');
        }
      }
    });
  }

  /**
   * Scan Linux for screen recording processes.
   */
  _scanLinuxProcesses() {
    exec('ps -Ao comm=', (error, stdout) => {
      if (error) return;

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const processName = line.trim().toLowerCase();

        if (this.recorderProcesses.has(processName)) {
          this._reportRecorder(processName, this.recorderProcesses.get(processName), 'process_match');
        }
      }
    });
  }

  /**
   * Report a screen recorder detection.
   */
  _reportRecorder(processName, info, method) {
    const key = `proc_${processName}`;
    if (this._alreadyDetected.has(key)) return;

    this._alreadyDetected.add(key);
    // Clear after 30 seconds so re-detection is possible
    setTimeout(() => this._alreadyDetected.delete(key), 30000);

    this.reportEvidence({
      type: 'screen_recorder_detected',
      severity: info.severity || 'low',
      metadata: {
        description: `Screen recording software detected: ${info.displayName}`,
        processName: processName,
        displayName: info.displayName,
        method: method
      }
    });
  }
}

module.exports = ScreenRecordingDetector;
