// ─────────────────────────────────────────────────────────────────────────────
// core/security/InputMonitor.js — Global Shortcuts and Clipboard
// ─────────────────────────────────────────────────────────────────────────────
//
// Blocks specific keyboard shortcuts (like PrintScreen, Alt+Tab if possible)
// and monitors clipboard interactions. Enhanced with comprehensive shortcut
// blocking including Game Bar, screenshots, and all function keys.
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
    this._registeredShortcuts = [];
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
    this._registeredShortcuts = [];
    
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
    const shortcutsToBlock = [...blocklist, ...softBlock];
    
    shortcutsToBlock.forEach(shortcut => {
      try {
        const success = globalShortcut.register(shortcut, () => {
          this._handleBlockedShortcut(shortcut);
        });
        if (success) {
          this._registeredShortcuts.push(shortcut);
        } else {
          console.warn(`[InputMonitor] Failed to register shortcut: ${shortcut}`);
        }
      } catch (err) {
        console.warn(`[InputMonitor] Error registering shortcut ${shortcut}: ${err.message}`);
      }
    });

    console.log(`[InputMonitor] Registered ${this._registeredShortcuts.length}/${shortcutsToBlock.length} shortcuts.`);
  }

  _handleBlockedShortcut(shortcut) {
    // Determine severity based on the type of shortcut
    const criticalShortcuts = [
      'Super', 'Meta', 'Alt+Tab', 'Meta+Tab', 'Super+G', 'Super+Alt+R',
      'Alt+F4', 'CommandOrControl+Shift+Esc'
    ];
    const highShortcuts = [
      'PrintScreen', 'Super+PrintScreen', 'Super+Shift+S',
      'CommandOrControl+Shift+S', 'CommandOrControl+Shift+I', 'F12'
    ];

    let severity = 'medium';
    if (criticalShortcuts.includes(shortcut)) {
      severity = 'low'; // Downgraded from critical to prevent instant force-exit
    } else if (highShortcuts.includes(shortcut)) {
      severity = 'high';
    }

    this.reportEvidence({
      type: 'shortcut_blocked',
      severity: severity,
      metadata: { 
        description: `Blocked shortcut used: ${shortcut}`,
        shortcutKey: shortcut
      }
    });

    // Force focus back to the exam window
    if (this.mainWindow && !this.mainWindow.isDestroyed() && !this.mainWindow.isFocused()) {
      this.mainWindow.focus();
    }
  }

  _startClipboardMonitoring() {
    // Electron's clipboard API doesn't have an "on change" event natively,
    // so we poll it.
    this.clipboardInterval = setInterval(() => {
      const currentText = clipboard.readText();
      
      // If clipboard changed and it's not empty, they copied something new.
      if (currentText && currentText !== this.lastClipboardText) {
        this.lastClipboardText = currentText;
        
        this.reportEvidence({
          type: 'clipboard_used',
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

  /**
   * Catches keyboard input at the webContents level BEFORE it reaches the page.
   * This handles keys that globalShortcut cannot intercept.
   */
  _handleBeforeInputEvent(event, input) {
    // Block Windows/Meta/Super key
    if (input.type === 'keyDown' && (input.key === 'Meta' || input.key === 'Super' || input.key === 'OS')) {
      event.preventDefault();
      this.reportEvidence({
        type: 'shortcut_blocked',
        severity: 'low',
        metadata: { 
          description: `Blocked Windows/Meta key used.`,
          shortcutKey: input.key
        }
      });
      return;
    }

    // Block Ctrl+Shift+I (DevTools) at the webContents level as backup
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
      this.reportEvidence({
        type: 'shortcut_blocked',
        severity: 'low',
        metadata: {
          description: 'Blocked DevTools shortcut (Ctrl+Shift+I)',
          shortcutKey: 'Ctrl+Shift+I'
        }
      });
      return;
    }

    // Block F12 (DevTools) at the webContents level as backup
    if (input.type === 'keyDown' && input.key === 'F12') {
      event.preventDefault();
      this.reportEvidence({
        type: 'shortcut_blocked',
        severity: 'low',
        metadata: {
          description: 'Blocked DevTools shortcut (F12)',
          shortcutKey: 'F12'
        }
      });
      return;
    }

    // Block Ctrl+U (view source)
    if (input.type === 'keyDown' && input.control && input.key.toLowerCase() === 'u') {
      event.preventDefault();
      return;
    }

    // Block Ctrl+P (print)
    if (input.type === 'keyDown' && input.control && input.key.toLowerCase() === 'p') {
      event.preventDefault();
      return;
    }

    // Block Ctrl+S (save)
    if (input.type === 'keyDown' && input.control && input.key.toLowerCase() === 's') {
      event.preventDefault();
      return;
    }

    // Block right-click context menu at input level
    if (input.type === 'keyDown' && input.key === 'ContextMenu') {
      event.preventDefault();
      return;
    }
  }
}

module.exports = InputMonitor;
