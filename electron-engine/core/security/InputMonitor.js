// ─────────────────────────────────────────────────────────────────────────────
// core/security/InputMonitor.js — Global Shortcuts and Clipboard
// ─────────────────────────────────────────────────────────────────────────────
//
// Blocks specific keyboard shortcuts (like PrintScreen, Alt+Tab if possible)
// and monitors clipboard interactions.
// ─────────────────────────────────────────────────────────────────────────────

const BaseMonitor = require('./BaseMonitor');
const { globalShortcut, clipboard } = require('electron');

class InputMonitor extends BaseMonitor {
  /**
   * @param {Object} mainWindow - The main Electron window
   * @param {Object} config - Policy configuration for this monitor
   */
  constructor(mainWindow, config) {
    super('InputMonitor');
    this.mainWindow = mainWindow;
    this.config = config;
    this.clipboardInterval = null;
    this.lastClipboardText = '';
    this._handleBeforeInputEvent = this._handleBeforeInputEvent.bind(this);
  }

  start() {
    if (this.isRunning) return;
    
    this._registerShortcuts();
    
    if (this.config.preventCopyPaste) {
      this._startClipboardMonitoring();
      // We also clear it on start just to be safe
      clipboard.clear();
      this.lastClipboardText = '';
    }

    this.mainWindow.webContents.on('before-input-event', this._handleBeforeInputEvent);
    
    this.isRunning = true;
    console.log('[InputMonitor] Started.');
  }

  stop() {
    if (!this.isRunning) return;
    
    globalShortcut.unregisterAll();
    
    if (this.clipboardInterval) {
      clearInterval(this.clipboardInterval);
      this.clipboardInterval = null;
    }

    this.mainWindow.webContents.removeListener('before-input-event', this._handleBeforeInputEvent);
    
    this.isRunning = false;
    console.log('[InputMonitor] Stopped.');
  }

  _registerShortcuts() {
    // We register the shortcuts defined in the policy.
    // By registering them globally and NOT passing the event down, we "block" them.
    const blocklist = this.config.blocklist || [];
    const softBlock = this.config.softBlock || [];
    const shortcutsToBlock = [...blocklist, ...softBlock, 'Super']; // Ensure Super (Windows key) is explicitly blocked if supported
    
    shortcutsToBlock.forEach(shortcut => {
      try {
        globalShortcut.register(shortcut, () => {
          this._handleBlockedShortcut(shortcut);
        });
      } catch (err) {
        console.warn(`[InputMonitor] Failed to register shortcut ${shortcut}: ${err.message}`);
      }
    });
  }

  _handleBlockedShortcut(shortcut) {
    const isCritical = ['Super', 'Meta', 'Alt+Tab'].includes(shortcut);
    this.reportViolation({
      eventType: 'shortcut_blocked',
      severity: isCritical ? 'critical' : 'medium',
      metadata: { 
        description: `Blocked shortcut used: ${shortcut}`,
        shortcutKey: shortcut
      }
    });
  }

  _startClipboardMonitoring() {
    // Electron's clipboard API doesn't have an "on change" event natively,
    // so we poll it.
    this.clipboardInterval = setInterval(() => {
      const currentText = clipboard.readText();
      
      // If clipboard changed and it's not empty, they copied something new.
      if (currentText && currentText !== this.lastClipboardText) {
        this.lastClipboardText = currentText;
        
        this.reportViolation({
          eventType: 'clipboard_used',
          severity: 'low',
          metadata: { 
            description: 'Clipboard modification detected. Copy/Paste is disabled.'
          }
        });
        
        // Immediately clear it so they can't paste it
        clipboard.clear();
        this.lastClipboardText = '';
      }
    }, 1000);
  }

  _handleBeforeInputEvent(event, input) {
    if (input.type === 'keyDown' && (input.key === 'Meta' || input.key === 'Super' || input.key === 'OS')) {
      event.preventDefault();
      this.reportViolation({
        eventType: 'shortcut_blocked',
        severity: 'critical',
        metadata: { 
          description: `Blocked Windows/Meta key used.`,
          shortcutKey: input.key
        }
      });
    }
  }
}

module.exports = InputMonitor;
