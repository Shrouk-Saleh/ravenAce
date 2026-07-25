// ─────────────────────────────────────────────────────────────────────────────
// core/security/IntegrityChecker.js — Config File Integrity Verification (V3)
// ─────────────────────────────────────────────────────────────────────────────
//
// Computes SHA-256 hashes of critical config files on startup and verifies
// them against a cryptographically signed .integrity.signed file using an
// embedded public key.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Config files to verify
const PROTECTED_FILES = [
  'securityPolicy.json',
  'forbiddenProcesses.json',
  'appConfig.json'
];

// In a real production build, this public key would be securely injected 
// during the build pipeline or obfuscated in C++ bindings. 
// For this implementation, we read it from an embedded file.
const PUBLIC_KEY_PATH = path.join(__dirname, '..', '..', 'config', 'public.pem');

class IntegrityChecker {
  /**
   * Compute SHA-256 hash of a file.
   * @param {string} filePath - Absolute path to file
   * @returns {string} Hex-encoded SHA-256 hash
   */
  static computeHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify config files against the signed .integrity.signed manifest.
   *
   * @param {string} configDir - Absolute path to the config directory
   * @returns {{ valid: boolean, reason: string|null, details: Object }}
   */
  static verify(configDir) {
    const integrityPath = path.join(configDir, '.integrity.signed');
    const result = { valid: true, reason: null, details: { checked: 0, passed: 0, failed: [] } };

    // Development bypass
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_INTEGRITY === 'true') {
      console.warn('[IntegrityChecker] Development mode bypass active. Skipping verification.');
      return result;
    }

    if (!fs.existsSync(integrityPath)) {
      result.valid = false;
      result.reason = 'Missing .integrity.signed manifest file.';
      return result;
    }

    if (!fs.existsSync(PUBLIC_KEY_PATH)) {
      result.valid = false;
      result.reason = 'Missing embedded public key (public.pem).';
      return result;
    }

    let signedData;
    let publicKey;
    try {
      signedData = JSON.parse(fs.readFileSync(integrityPath, 'utf-8'));
      publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf-8');
    } catch (err) {
      result.valid = false;
      result.reason = `Failed to read integrity files: ${err.message}`;
      return result;
    }

    // 1. Verify Cryptographic Signature
    const { payload, signature } = signedData;
    if (!payload || !signature) {
      result.valid = false;
      result.reason = 'Invalid signed manifest format.';
      return result;
    }

    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(JSON.stringify(payload));
    const isSignatureValid = verify.verify(publicKey, signature, 'hex');

    if (!isSignatureValid) {
      result.valid = false;
      result.reason = 'CRYPTOGRAPHIC SIGNATURE INVALID. The configuration manifest was forged or tampered with.';
      console.error(`[IntegrityChecker] ${result.reason}`);
      return result;
    }

    // 2. Verify File Hashes against the verified payload
    for (const [fileName, expectedHash] of Object.entries(payload.files)) {
      const filePath = path.join(configDir, fileName);
      result.details.checked++;

      if (!fs.existsSync(filePath)) {
        result.valid = false;
        result.details.failed.push({ file: fileName, reason: 'missing' });
        continue;
      }

      const actualHash = IntegrityChecker.computeHash(filePath);
      if (actualHash !== expectedHash) {
        result.valid = false;
        result.details.failed.push({
          file: fileName,
          reason: 'hash_mismatch',
          expected: expectedHash.substring(0, 16) + '...',
          actual: actualHash.substring(0, 16) + '...'
        });
      } else {
        result.details.passed++;
      }
    }

    if (!result.valid) {
      const failedFiles = result.details.failed.map(f => f.file).join(', ');
      result.reason = `Config integrity check failed for: ${failedFiles}. Files modified after signing.`;
      console.error(`[IntegrityChecker] INTEGRITY CHECK FAILED: ${result.reason}`);
    } else {
      console.log(`[IntegrityChecker] All ${result.details.checked} config files passed RSA cryptographic integrity check.`);
    }

    return result;
  }
}

module.exports = IntegrityChecker;
