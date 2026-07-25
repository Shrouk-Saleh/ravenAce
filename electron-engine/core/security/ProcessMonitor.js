// ─────────────────────────────────────────────────────────────────────────────
// core/security/ProcessMonitor.js — Blacklisted Process Scanner & Killer
// ─────────────────────────────────────────────────────────────────────────────
//
// Periodically scans the host OS for forbidden processes.
// NEW in V2: Persistent blocked set, graceful SIGTERM -> SIGKILL on Mac/Linux,
// system safelist to prevent killing explorer.exe, Windows WMI event support
// for instant kill on process creation, and PE metadata verification.
// ─────────────────────────────────────────────────────────────────────────────

const BaseMonitor = require('./BaseMonitor');
const ProcessVerifier = require('./ProcessVerifier');
const { exec, spawn } = require('child_process');
const os = require('os');
const path = require('path');
const forbiddenProcesses = require('../../config/forbiddenProcesses.json');

const SYSTEM_SAFE_LIST = new Set([
  'explorer.exe', 'dwm.exe', 'csrss.exe', 'smss.exe', 'wininit.exe',
  'services.exe', 'svchost.exe', 'lsass.exe', 'lsaiso.exe',
  'winlogon.exe', 'fontdrvhost.exe', 'conhost.exe', 'dllhost.exe',
  'sihost.exe', 'taskhostw.exe', 'runtimebroker.exe', 'searchhost.exe',
  'shellexperiencehost.exe', 'startmenuexperiencehost.exe',
  'textinputhost.exe', 'ctfmon.exe', 'audiodg.exe', 'spoolsv.exe',
  'msdtc.exe', 'searchindexer.exe', 'securityhealthsystray.exe',
  'system', 'registry', 'idle', 'ntoskrnl.exe', 'kernel',
  // macOS equivalents
  'launchd', 'kernel_task', 'windowserver', 'loginwindow', 'dock',
  'finder', 'systempolicyd', 'coreaudiod', 'coreservicesd',
  // Linux
  'systemd', 'init'
]);

class ProcessMonitor extends BaseMonitor {
  /**
   * @param {Object} config - Policy configuration for this monitor
   */
  constructor(config) {
    super('ProcessMonitor');
    this.config = config;
    this.scanInterval = null;
    this.platform = os.platform();
    this.killOnDetect = config.killOnDetect !== false;
    this.useWmiEvents = this.platform === 'win32' && config.useWmiEvents !== false;
    this.wmiProcess = null;
    this.scanCount = 0;
    this.peCheckInterval = config.peMetadataCheckInterval || 5;

    this.blacklist = this._buildBlacklist();
    this._blockedProcesses = new Map(); // name -> { timestamp, killCount, lastPid }
    
    // Pass the raw array to ProcessVerifier for PE metadata maps
    this.verifier = new ProcessVerifier(this.blacklist, forbiddenProcesses.processes);
  }

  _buildBlacklist() {
    const list = new Map();
    if (forbiddenProcesses.processes) {
      forbiddenProcesses.processes.forEach(proc => {
        if (proc.platform === this.platform && proc.name) {
          list.set(proc.name.toLowerCase(), {
            severity: proc.severity || 'high',
            category: proc.category || 'unknown',
            displayName: proc.displayName || proc.name
          });
        }
      });
    }
    return list;
  }

  start() {
    if (this.isRunning) return;

    const intervalMs = (this.config.scanIntervalSeconds || 1) * 1000;

    // Run initial scan
    this._scanAndKill();

    this.scanInterval = setInterval(() => {
      this.scanCount++;
      this._scanAndKill();

      // Run PE metadata check periodically
      if (this.scanCount % this.peCheckInterval === 0) {
        this._runVerifierScan();
      }
    }, intervalMs);

    if (this.useWmiEvents) {
      this._startWmiSubscription();
    }

    this.isRunning = true;
    console.log(`[ProcessMonitor] Started. Scan interval: ${intervalMs}ms. Kill mode: ${this.killOnDetect}`);
  }

  stop() {
    if (!this.isRunning) return;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    if (this.wmiProcess) {
      this.wmiProcess.kill();
      this.wmiProcess = null;
    }

    this._blockedProcesses.clear();
    this.isRunning = false;
    console.log('[ProcessMonitor] Stopped.');
  }

  /**
   * Start a long-running PowerShell process to subscribe to WMI process creation events.
   * This provides near-instant detection (no polling delay).
   */
  _startWmiSubscription() {
    const psScript = `
      $query = "SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'"
      Register-WmiEvent -Query $query -SourceIdentifier "ProcessStart" -Action {
        $proc = $Event.SourceEventArgs.NewEvent.TargetInstance
        $json = @{
          Name = $proc.Name
          ProcessId = $proc.ProcessId
          ExecutablePath = $proc.ExecutablePath
        } | ConvertTo-Json -Compress
        Write-Output "WMI_PROC: $json"
      }
      Write-Output "WMI Subscription Started"
      while ($true) { Start-Sleep -Seconds 10 }
    `;

    this.wmiProcess = spawn('powershell', ['-NoProfile', '-Command', psScript], { windowsHide: true });

    this.wmiProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('WMI_PROC:')) {
          try {
            const jsonStr = line.substring(9).trim();
            const proc = JSON.parse(jsonStr);
            this._handleProcessDetected(proc.Name.toLowerCase(), proc.ProcessId, proc.ExecutablePath);
          } catch (err) {
            // parse error, ignore
          }
        }
      }
    });

    this.wmiProcess.on('error', (err) => {
      console.warn(`[ProcessMonitor] WMI subscription error: ${err.message}. Falling back to polling.`);
      this.useWmiEvents = false;
    });
  }

  /**
   * Handle detection of a specific process. Called by both WMI and polling.
   */
  _handleProcessDetected(processName, pid, processPath = 'unknown') {
    if (SYSTEM_SAFE_LIST.has(processName)) return;

    if (this.blacklist.has(processName)) {
      const info = this.blacklist.get(processName);
      this._enforceBlacklist(processName, pid, processPath, info);
    }
  }

  /**
   * Execute kill logic and handle persistent tracking/logging.
   */
  _enforceBlacklist(processName, pid, processPath, info) {
    let blockData = this._blockedProcesses.get(processName);
    const isNewDetection = !blockData;
    
    // Don't re-kill if it's the exact same PID we just killed (race condition)
    if (blockData && blockData.lastPid === pid && (Date.now() - blockData.timestamp < 2000)) {
      return;
    }

    if (this.killOnDetect) {
      if (this.platform === 'win32') {
        this._killProcessWindows(processName, pid);
      } else {
        this._killProcessGraceful(processName, pid);
      }
    }

    if (isNewDetection) {
      // First time we've seen this process. Log the full violation.
      this._blockedProcesses.set(processName, { timestamp: Date.now(), killCount: 1, lastPid: pid });
      
      this.reportEvidence({
        type: 'forbidden_process',
        severity: info.severity || 'low',
        metadata: {
          description: `Forbidden process detected: ${info.displayName}`,
          processName,
          processId: pid,
          processPath,
          category: info.category,
          displayName: info.displayName,
          action: this.killOnDetect ? 'killed' : 'detected'
        }
      });
    } else {
      // It came back. Kill it, update tracking, log quietly.
      blockData.killCount++;
      blockData.timestamp = Date.now();
      blockData.lastPid = pid;
      console.log(`[ProcessMonitor] Persistent block: Re-killed ${processName} (kill count: ${blockData.killCount})`);
    }
  }

  async _runVerifierScan() {
    const detections = await this.verifier.scan();
    for (const d of detections) {
      const processNameLower = d.currentName.toLowerCase();
      // Only report/kill if we haven't already hit it normally
      if (!this._blockedProcesses.has(processNameLower)) {
        this._enforceBlacklist(processNameLower, d.pid, d.path, d.info);
      }
    }
  }

  _scanAndKill() {
    if (this.platform === 'win32') {
      this._scanWindows();
    } else if (this.platform === 'darwin') {
      this._scanMac();
    } else {
      this._scanLinux();
    }
  }

  _scanWindows() {
    exec('tasklist /NH /FO CSV', { windowsHide: true }, (error, stdout) => {
      if (error) return;
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split('","');
        if (parts.length < 2) continue;

        const processName = parts[0].replace(/^"/, '').toLowerCase();
        const pid = parts[1] ? parseInt(parts[1].replace(/"/g, '').trim(), 10) : null;
        this._handleProcessDetected(processName, pid);
      }
    });
  }

  _scanMac() {
    exec('ps -Ao pid=,comm=', (error, stdout) => {
      if (error) return;
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const spaceIdx = line.trim().indexOf(' ');
        if (spaceIdx === -1) continue;

        const pid = parseInt(line.substring(0, spaceIdx).trim(), 10);
        const processPath = line.substring(spaceIdx + 1).trim();
        const processName = processPath.split('/').pop().toLowerCase();
        
        this._handleProcessDetected(processName, pid, processPath);
      }
    });
  }

  _scanLinux() {
    // Same ps command as Mac
    this._scanMac();
  }

  _killProcessWindows(processName, pid) {
    if (SYSTEM_SAFE_LIST.has(processName)) return;
    
    // If we have a PID, target it specifically to be safer.
    // Otherwise fallback to image name.
    const target = pid ? `/PID ${pid}` : `/IM "${processName}"`;
    exec(`taskkill /F ${target}`, { windowsHide: true }, (error) => {
      if (error && !error.message.includes('not found')) {
        console.error(`[ProcessMonitor] Failed to kill ${target}: ${error.message}`);
      }
    });
  }

  /**
   * Graceful kill for Mac/Linux.
   * Sends SIGTERM, waits 1s, sends SIGKILL if still alive.
   */
  _killProcessGraceful(processName, pid) {
    if (SYSTEM_SAFE_LIST.has(processName)) return;
    if (!pid) return;

    try {
      process.kill(pid, 'SIGTERM');
      
      const timeoutMs = this.config.gracefulKillTimeoutMs || 1000;
      setTimeout(() => {
        try {
          // If this doesn't throw, the process is still alive
          process.kill(pid, 0); 
          process.kill(pid, 'SIGKILL');
          console.warn(`[ProcessMonitor] Sent SIGKILL to ${processName} (${pid}) after SIGTERM timeout.`);
        } catch (e) {
          // Process is gone, nothing to do
        }
      }, timeoutMs);
    } catch (e) {
      if (e.code !== 'ESRCH') {
        console.error(`[ProcessMonitor] Failed to send SIGTERM to ${processName} (${pid}): ${e.message}`);
      }
    }
  }

  /**
   * Run a one-time scan that kills all forbidden processes.
   * Returns a promise resolving to the list of killed display names.
   */
  async runPreflightScan() {
    return new Promise((resolve) => {
      const killed = new Set();
      const checkAndKill = (processName, pid, info) => {
        if (!SYSTEM_SAFE_LIST.has(processName)) {
          killed.add(info.displayName);
          if (this.platform === 'win32') {
            this._killProcessWindows(processName, pid);
          } else {
            this._killProcessGraceful(processName, pid);
          }
        }
      };

      if (this.platform === 'win32') {
        exec('tasklist /NH /FO CSV', { windowsHide: true }, (error, stdout) => {
          if (!error) {
            const lines = stdout.split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;
              const parts = line.split('","');
              if (parts.length < 2) continue;
              const processName = parts[0].replace(/^"/, '').toLowerCase();
              const pid = parts[1] ? parseInt(parts[1].replace(/"/g, '').trim(), 10) : null;
              if (this.blacklist.has(processName)) {
                checkAndKill(processName, pid, this.blacklist.get(processName));
              }
            }
          }
          setTimeout(() => resolve([...killed]), 2000);
        });
      } else {
        exec('ps -Ao pid=,comm=', (error, stdout) => {
          if (!error) {
            const lines = stdout.split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;
              const spaceIdx = line.trim().indexOf(' ');
              if (spaceIdx === -1) continue;
              const pid = parseInt(line.substring(0, spaceIdx).trim(), 10);
              const processName = line.substring(spaceIdx + 1).trim().split('/').pop().toLowerCase();
              if (this.blacklist.has(processName)) {
                checkAndKill(processName, pid, this.blacklist.get(processName));
              }
            }
          }
          setTimeout(() => resolve([...killed]), 2000);
        });
      }
    });
  }
}

module.exports = ProcessMonitor;
