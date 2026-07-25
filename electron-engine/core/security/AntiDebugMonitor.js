// ─────────────────────────────────────────────────────────────────────────────
// core/security/AntiDebugMonitor.js — Debugger & Inspector Detection
// ─────────────────────────────────────────────────────────────────────────────
//
// Continuous monitor that detects debugging and reverse-engineering attempts:
// - Node.js --inspect / --inspect-brk flags
// - NODE_OPTIONS with inspect flags
// - Active debug port
// - Timing-based debugger detection
// - RE tools are caught by ProcessMonitor via forbiddenProcesses.json
// ─────────────────────────────────────────────────────────────────────────────

const BaseMonitor = require('./BaseMonitor');

class AntiDebugMonitor extends BaseMonitor {
  constructor(config) {
    super('AntiDebugMonitor');
    this.config = config || {};
    this.scanInterval = null;
    this._initialCheckDone = false;
  }

  start() {
    if (this.isRunning) return;

    // Run initial checks immediately (one-shot detections)
    if (!this._initialCheckDone) {
      this._checkInspectFlags();
      this._checkNodeOptions();
      this._initialCheckDone = true;
    }

    // Periodic checks for runtime debugger attachment
    const intervalMs = (this.config.scanIntervalSeconds || 5) * 1000;
    this.scanInterval = setInterval(() => {
      this._checkDebugPort();
      this._checkTimingAnomaly();
    }, intervalMs);

    this.isRunning = true;
    console.log('[AntiDebugMonitor] Started.');
  }

  stop() {
    if (!this.isRunning) return;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    this.isRunning = false;
    console.log('[AntiDebugMonitor] Stopped.');
  }

  /**
   * Check process.argv for --inspect, --inspect-brk, --remote-debugging-port.
   * These indicate Node.js debugger was attached at startup.
   */
  _checkInspectFlags() {
    const suspiciousFlags = ['--inspect', '--inspect-brk', '--inspect-port', '--remote-debugging-port'];
    const argv = process.argv || [];
    const execArgv = process.execArgv || [];
    const allArgs = [...argv, ...execArgv];

    for (const arg of allArgs) {
      for (const flag of suspiciousFlags) {
        if (arg.startsWith(flag)) {
          this.reportEvidence({
            type: 'inspector_detected',
            severity: 'low',
            metadata: {
              description: `Node.js inspector flag detected: ${arg}`,
              flag: arg,
              method: 'argv_check'
            }
          });
          return; // Report once
        }
      }
    }
  }

  /**
   * Check NODE_OPTIONS environment variable for inspect flags.
   */
  _checkNodeOptions() {
    const nodeOptions = process.env.NODE_OPTIONS || '';
    if (!nodeOptions) return;

    const suspiciousPatterns = ['--inspect', '--inspect-brk', '--debug', '--debug-brk'];
    for (const pattern of suspiciousPatterns) {
      if (nodeOptions.includes(pattern)) {
        this.reportEvidence({
          type: 'inspector_detected',
          severity: 'low',
          metadata: {
            description: `NODE_OPTIONS contains inspector flag: ${pattern}`,
            nodeOptions: nodeOptions,
            method: 'env_check'
          }
        });
        return;
      }
    }
  }

  /**
   * Check if a debug port is active.
   * process.debugPort is non-zero when a debugger is attached.
   */
  _checkDebugPort() {
    if (process.debugPort && process.debugPort > 0) {
      // In development, debugging is expected. Only flag in production.
      if (process.env.NODE_ENV !== 'development') {
        this.reportEvidence({
          type: 'debugger_detected',
          severity: 'low',
          metadata: {
            description: `Active debug port detected: ${process.debugPort}`,
            debugPort: process.debugPort,
            method: 'debug_port_check'
          }
        });
      }
    }
  }

  /**
   * Timing-based debugger detection.
   * When a debugger is paused on a breakpoint, setTimeout/setInterval callbacks
   * are delayed significantly. We measure the delta between expected and actual
   * callback time. A large discrepancy (>500ms) suggests debugger intervention.
   */
  _checkTimingAnomaly() {
    const expectedDelay = 100; // ms
    const start = Date.now();

    setTimeout(() => {
      const elapsed = Date.now() - start;
      const drift = elapsed - expectedDelay;

      // If the callback was delayed by more than 2 seconds beyond expected,
      // something is holding up the event loop (likely a debugger breakpoint).
      // V3: Demoted to medium severity (adds to risk score, doesn't instant-kill) 
      // to avoid false positives from CPU spikes or OS sleep.
      if (drift > 2000) {
        this.reportEvidence({
          type: 'timing_anomaly_detected',
          severity: 'medium', 
          confidence: 0.8,
          metadata: {
            description: `Timing anomaly detected: expected ~${expectedDelay}ms delay, got ${elapsed}ms (drift: ${drift}ms). Possible debugger breakpoint or severe CPU load.`,
            expectedMs: expectedDelay,
            actualMs: elapsed,
            driftMs: drift,
            method: 'timing_check'
          }
        });
      }
    }, expectedDelay);
  }
}

module.exports = AntiDebugMonitor;
