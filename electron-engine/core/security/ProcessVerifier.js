// ─────────────────────────────────────────────────────────────────────────────
// core/security/ProcessVerifier.js — PE Metadata Verification (Anti-Rename)
// ─────────────────────────────────────────────────────────────────────────────
//
// Windows-only module that reads PE metadata (OriginalFilename, CompanyName,
// ProductName) from running processes via PowerShell. This catches renamed
// executables — e.g. chrome.exe renamed to math.exe still has
// OriginalFilename = "chrome.exe" in its PE header.
//
// Designed to be called periodically (every Nth scan cycle) from ProcessMonitor
// because the PowerShell command has non-trivial overhead (~2-3s).
// ─────────────────────────────────────────────────────────────────────────────

const { exec } = require('child_process');
const os = require('os');

class ProcessVerifier {
  /**
   * @param {Map} blacklist - The blacklist Map from ProcessMonitor (name → info)
   * @param {Array} rawProcessList - The raw process list from forbiddenProcesses.json
   */
  constructor(blacklist, rawProcessList) {
    this.platform = os.platform();
    this.blacklist = blacklist;

    // Build lookup maps from the raw process list for PE metadata matching
    // Map<lowercase originalFilename → { name, severity, category, displayName }>
    this.originalFilenameMap = new Map();
    // Map<lowercase companyName → [{ name, severity, category, displayName, productName }]>
    this.companyNameMap = new Map();
    // Map<lowercase productName → { name, severity, category, displayName }>
    this.productNameMap = new Map();

    if (rawProcessList) {
      rawProcessList.forEach(proc => {
        if (proc.platform !== this.platform) return;

        const info = {
          name: proc.name,
          severity: proc.severity || 'high',
          category: proc.category || 'unknown',
          displayName: proc.displayName || proc.name
        };

        if (proc.originalFilename) {
          this.originalFilenameMap.set(proc.originalFilename.toLowerCase(), info);
        }
        if (proc.companyName) {
          const key = proc.companyName.toLowerCase();
          if (!this.companyNameMap.has(key)) {
            this.companyNameMap.set(key, []);
          }
          this.companyNameMap.get(key).push({ ...info, productName: proc.productName });
        }
        if (proc.productName) {
          this.productNameMap.set(proc.productName.toLowerCase(), info);
        }
      });
    }

    console.log(`[ProcessVerifier] Loaded PE metadata: ${this.originalFilenameMap.size} filenames, ${this.companyNameMap.size} companies, ${this.productNameMap.size} products`);
  }

  /**
   * Scan running processes for PE metadata matches.
   * Returns an array of detected renamed processes.
   *
   * @returns {Promise<Array<{ pid: number, currentName: string, path: string, matchedBy: string, matchedValue: string, info: Object }>>}
   */
  async scan() {
    if (this.platform !== 'win32') {
      // PE metadata is Windows-specific
      return [];
    }

    if (this.originalFilenameMap.size === 0 && this.companyNameMap.size === 0 && this.productNameMap.size === 0) {
      return [];
    }

    return new Promise((resolve) => {
      // PowerShell command to get PE version info for all processes with a path
      const psCmd = [
        'powershell -NoProfile -Command "',
        'Get-Process | Where-Object {$_.Path -ne $null} | ForEach-Object {',
        '  $path = $_.Path;',
        '  $vi = $_.MainModule.FileVersionInfo;',
        '  $sig = Get-AuthenticodeSignature -FilePath $path -ErrorAction SilentlyContinue;',
        '  $hash = Get-FileHash -Path $path -Algorithm SHA256 -ErrorAction SilentlyContinue;',
        '  [PSCustomObject]@{',
        '    Id=$_.Id;',
        '    Name=$_.ProcessName;',
        '    Path=$path;',
        '    OriginalFilename=$vi.OriginalFilename;',
        '    CompanyName=$vi.CompanyName;',
        '    ProductName=$vi.ProductName;',
        '    SignatureStatus=if ($sig) { $sig.Status.ToString() } else { \'Unknown\' };',
        '    Publisher=if ($sig) { $sig.SignerCertificate.Subject } else { \'Unknown\' };',
        '    FileHash=if ($hash) { $hash.Hash } else { \'Unknown\' }',
        '  }',
        '} | ConvertTo-Json -Compress"'
      ].join(' ');

      exec(psCmd, { windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
        if (error) {
          console.warn(`[ProcessVerifier] PowerShell scan failed: ${error.message}`);
          resolve([]);
          return;
        }

        let processes;
        try {
          const trimmed = stdout.trim();
          if (!trimmed) { resolve([]); return; }
          processes = JSON.parse(trimmed);
          // PowerShell returns a single object if only one process, wrap it
          if (!Array.isArray(processes)) processes = [processes];
        } catch (parseErr) {
          console.warn(`[ProcessVerifier] Failed to parse PowerShell output: ${parseErr.message}`);
          resolve([]);
          return;
        }

        const detections = [];

        for (const proc of processes) {
          if (!proc || !proc.Name) continue;

          const currentNameLower = (proc.Name + '.exe').toLowerCase();

          // Skip if this process is ALREADY matched by the normal blacklist
          // (no need to double-report)
          if (this.blacklist.has(currentNameLower)) continue;

          // Check OriginalFilename
          if (proc.OriginalFilename) {
            const origLower = proc.OriginalFilename.toLowerCase();
            if (this.originalFilenameMap.has(origLower) && origLower !== currentNameLower) {
              const info = this.originalFilenameMap.get(origLower);
              detections.push({
                pid: proc.Id,
                currentName: proc.Name,
                path: proc.Path || 'unknown',
                matchedBy: 'OriginalFilename',
                matchedValue: proc.OriginalFilename,
                signatureStatus: proc.SignatureStatus,
                publisher: proc.Publisher,
                fileHash: proc.FileHash,
                info
              });
              continue; // Don't double-match
            }
          }

          // Check CompanyName
          if (proc.CompanyName) {
            const companyLower = proc.CompanyName.toLowerCase();
            if (this.companyNameMap.has(companyLower)) {
              const entries = this.companyNameMap.get(companyLower);
              for (const entry of entries) {
                // If productName is specified, also check it
                if (entry.productName && proc.ProductName) {
                  if (proc.ProductName.toLowerCase() === entry.productName.toLowerCase()) {
                    detections.push({
                      pid: proc.Id,
                      currentName: proc.Name,
                      path: proc.Path || 'unknown',
                      matchedBy: 'CompanyName+ProductName',
                      matchedValue: `${proc.CompanyName} / ${proc.ProductName}`,
                      signatureStatus: proc.SignatureStatus,
                      publisher: proc.Publisher,
                      fileHash: proc.FileHash,
                      info: entry
                    });
                    break;
                  }
                }
              }
            }
          }

          // Check ProductName standalone
          if (proc.ProductName) {
            const productLower = proc.ProductName.toLowerCase();
            if (this.productNameMap.has(productLower)) {
              const info = this.productNameMap.get(productLower);
              // Avoid double-detect if already caught by company check
              if (!detections.some(d => d.pid === proc.Id)) {
                detections.push({
                  pid: proc.Id,
                  currentName: proc.Name,
                  path: proc.Path || 'unknown',
                  matchedBy: 'ProductName',
                  matchedValue: proc.ProductName,
                  signatureStatus: proc.SignatureStatus,
                  publisher: proc.Publisher,
                  fileHash: proc.FileHash,
                  info
                });
              }
            }
          }
        }

        if (detections.length > 0) {
          console.warn(`[ProcessVerifier] Found ${detections.length} renamed/disguised processes.`);
        }

        resolve(detections);
      });
    });
  }
}

module.exports = ProcessVerifier;
