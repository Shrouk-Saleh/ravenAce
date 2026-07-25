// ─────────────────────────────────────────────────────────────────────────────
// core/security/NetworkMonitor.js — Proxy/MITM Detection
// ─────────────────────────────────────────────────────────────────────────────
//
// Continuous monitor that detects:
// A. System proxy settings (Windows registry)
// B. Proxy tool processes (via forbiddenProcesses.json, handled by ProcessMonitor)
// C. Certificate pinning (configured in SecurityManager/main.js)
//
// Proxy tool process detection is handled by ProcessMonitor via the
// "proxy_tools" category in forbiddenProcesses.json. This monitor focuses
// on system-level proxy configuration detection.
// ─────────────────────────────────────────────────────────────────────────────

const BaseMonitor = require('./BaseMonitor');
const { exec } = require('child_process');
const os = require('os');

class NetworkMonitor extends BaseMonitor {
  constructor(config) {
    super('NetworkMonitor');
    this.config = config || {};
    this.platform = os.platform();
    this.scanInterval = null;
    this._lastProxyState = null; // Track state to avoid duplicate reports
  }

  start() {
    if (this.isRunning) return;

    const intervalMs = (this.config.scanIntervalSeconds || 10) * 1000;

    // Initial check
    this._checkSystemProxy();

    this.scanInterval = setInterval(() => {
      this._checkSystemProxy();
    }, intervalMs);

    this.isRunning = true;
    console.log('[NetworkMonitor] Started.');
  }

  stop() {
    if (!this.isRunning) return;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    this._lastProxyState = null;
    this.isRunning = false;
    console.log('[NetworkMonitor] Stopped.');
  }

  /**
   * Check if a system proxy is enabled.
   */
  _checkSystemProxy() {
    if (this.platform === 'win32') {
      this._checkWindowsProxy();
    } else if (this.platform === 'darwin') {
      this._checkMacProxy();
    } else {
      this._checkLinuxProxy();
    }
  }

  /**
   * Windows: Query the registry for proxy settings.
   */
  _checkWindowsProxy() {
    exec(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable',
      { windowsHide: true, timeout: 5000 },
      (error, stdout) => {
        if (error) return;

        // Parse the registry value — ProxyEnable REG_DWORD 0x1 means enabled
        const match = stdout.match(/ProxyEnable\s+REG_DWORD\s+(0x[0-9a-fA-F]+)/);
        if (match) {
          const proxyEnabled = parseInt(match[1], 16) === 1;

          if (proxyEnabled && this._lastProxyState !== true) {
            this._lastProxyState = true;

            // Get the proxy server address for logging
            exec(
              'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
              { windowsHide: true, timeout: 5000 },
              (err2, stdout2) => {
                let proxyServer = 'unknown';
                if (!err2) {
                  const serverMatch = stdout2.match(/ProxyServer\s+REG_SZ\s+(.+)/);
                  if (serverMatch) proxyServer = serverMatch[1].trim();
                }

                this.reportEvidence({
                  type: 'system_proxy_detected',
                  severity: 'low',
                  confidence: 1.0,
                  metadata: {
                    description: `System HTTP proxy is enabled: ${proxyServer}`,
                    proxyServer: proxyServer,
                    method: 'registry_check',
                    platform: 'win32'
                  }
                });
              }
            );
          } else if (!proxyEnabled) {
            this._lastProxyState = false;
          }
        }
      }
    );
  }

  /**
   * macOS: Check networksetup for proxy settings.
   */
  _checkMacProxy() {
    exec('networksetup -getwebproxy "Wi-Fi"', { timeout: 5000 }, (error, stdout) => {
      if (error) return;

      const output = stdout.toLowerCase();
      const isEnabled = output.includes('enabled: yes');

      if (isEnabled && this._lastProxyState !== true) {
        this._lastProxyState = true;

        this.reportEvidence({
          type: 'system_proxy_detected',
          severity: 'low',
          confidence: 1.0,
          metadata: {
            description: 'System HTTP proxy is enabled on Wi-Fi interface.',
            method: 'networksetup_check',
            platform: 'darwin'
          }
        });
      } else if (!isEnabled) {
        this._lastProxyState = false;
      }
    });
  }

  /**
   * Linux: Check environment variables for proxy settings.
   */
  _checkLinuxProxy() {
    const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY || '';
    const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY || '';

    if ((httpProxy || httpsProxy) && this._lastProxyState !== true) {
      this._lastProxyState = true;

      this.reportEvidence({
        type: 'system_proxy_detected',
        severity: 'low',
        confidence: 1.0,
        metadata: {
          description: `System proxy environment variable detected: ${httpProxy || httpsProxy}`,
          httpProxy: httpProxy || null,
          httpsProxy: httpsProxy || null,
          method: 'env_check',
          platform: 'linux'
        }
      });
    } else if (!httpProxy && !httpsProxy) {
      this._lastProxyState = false;
    }
  }
}

module.exports = NetworkMonitor;
