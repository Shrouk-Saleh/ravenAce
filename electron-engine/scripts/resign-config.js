/**
 * scripts/resign-config.js
 *
 * Resign-only utility — uses the EXISTING private.pem.dev and public.pem to
 * regenerate the signed integrity manifest for the current config files.
 * Run this EVERY TIME you modify any file in the config/ directory.
 *
 * Usage:  node scripts/resign-config.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const PROTECTED_FILES = [
  'securityPolicy.json',
  'forbiddenProcesses.json',
  'appConfig.json'
];

function resignOnly() {
  const privPath = path.join(CONFIG_DIR, 'private.pem.dev');
  const pubPath  = path.join(CONFIG_DIR, 'public.pem');

  if (!fs.existsSync(privPath)) {
    console.error(`ERROR: Cannot find private key at ${privPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(pubPath)) {
    console.error(`ERROR: Cannot find public key at ${pubPath}`);
    process.exit(1);
  }

  const privateKey = fs.readFileSync(privPath, 'utf-8');

  // Build payload with current hashes
  const payload = {
    generatedAt: new Date().toISOString(),
    algorithm: 'RSA-SHA256',
    files: {}
  };

  for (const fileName of PROTECTED_FILES) {
    const filePath = path.join(CONFIG_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      payload.files[fileName] = hash;
      console.log(`Hashed ${fileName}: ${hash}`);
    } else {
      console.warn(`WARNING: ${fileName} not found — skipped.`);
    }
  }

  // Sign with existing private key
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(JSON.stringify(payload));
  const signature = sign.sign(privateKey, 'hex');

  const signedManifest = { payload, signature };
  const manifestPath = path.join(CONFIG_DIR, '.integrity.signed');
  fs.writeFileSync(manifestPath, JSON.stringify(signedManifest, null, 2));
  console.log(`\n✅  Signed manifest written to ${manifestPath}`);
}

resignOnly();
