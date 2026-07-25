// ─────────────────────────────────────────────────────────────────────────────
// core/security/KioskManager.js — Strict Kiosk Enforcement
// ─────────────────────────────────────────────────────────────────────────────
//
// On Windows, killing explorer.exe is the most robust way to prevent the
// Start Menu, Taskbar, and Windows Key from breaking fullscreen mode.
// This manager kills it on start, and restores it on stop/exit.
// A detached PowerShell watchdog is used as a safety net to restore explorer
// if the engine crashes unexpectedly.
// ─────────────────────────────────────────────────────────────────────────────

const { exec, spawn } = require('child_process');
const os = require('os');
const BaseMonitor = require('./BaseMonitor');

class KioskManager extends BaseMonitor {
  /**
   * @param {Object} config - Policy configuration for kiosk mode
   */
  constructor(config) {
    super('KioskManager');
    this.config = config || {};
    this.platform = os.platform();
    this.explorerKilled = false;
    this.watchdog = null;
  }

  start() {
    if (this.isRunning) return;

    if (this.platform === 'win32' && this.config.killExplorerOnWindows) {
      this._killExplorer();
    }

    this.isRunning = true;
    console.log('[KioskManager] Started.');
  }

  stop() {
    if (!this.isRunning) return;

    if (this.platform === 'win32' && this.explorerKilled) {
      this._restoreExplorer();
    }

    this.isRunning = false;
    console.log('[KioskManager] Stopped.');
  }

  _killExplorer() {
    // 1. Start a detached watchdog to restart explorer if this process crashes
    const parentPid = process.pid;
    const psScript = `
      Wait-Process -Id ${parentPid}
      $explorer = Get-Process -Name explorer -ErrorAction SilentlyContinue
      if (-not $explorer) {
        Start-Process explorer.exe
      }
    `;

    this.watchdog = spawn('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psScript], {
      detached: true,
      stdio: 'ignore'
    });
    this.watchdog.unref();

    // 2. Kill explorer.exe
    exec('taskkill /f /im explorer.exe', (err) => {
      if (!err || (err.message && err.message.includes('not found'))) {
        this.explorerKilled = true;
        console.log('[KioskManager] Killed explorer.exe for strict kiosk mode.');
      } else {
        console.warn('[KioskManager] Failed to kill explorer.exe:', err.message);
      }
    });
  }

  _restoreExplorer() {
    exec('start explorer.exe', (err) => {
      if (!err) {
        console.log('[KioskManager] Restored explorer.exe.');
        this.explorerKilled = false;
      } else {
        console.warn('[KioskManager] Failed to restore explorer.exe:', err.message);
      }
    });

    if (this.watchdog) {
      try {
        this.watchdog.kill();
      } catch (e) {}
      this.watchdog = null;
    }
  }
}

module.exports = KioskManager;
