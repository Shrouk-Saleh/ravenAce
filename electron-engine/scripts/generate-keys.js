/**
 * scripts/generate-keys.js
 * 
 * Development utility to generate an RSA keypair and sign the configuration files.
 * In a real production environment, the private key would be kept offline in a 
 * secure vault, and only this script (running in CI/CD) would have access to it
 * to produce the signed manifest.
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

function generateAndSign() {
  console.log('Generating new 2048-bit RSA keypair...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  // Save the public key for the app to use
  const pubPath = path.join(CONFIG_DIR, 'public.pem');
  fs.writeFileSync(pubPath, publicKey);
  console.log(`Saved public key to ${pubPath}`);

  // In dev, we save the private key locally. IN PROD, DO NOT DO THIS.
  const privPath = path.join(CONFIG_DIR, 'private.pem.dev');
  fs.writeFileSync(privPath, privateKey);
  console.log(`Saved development private key to ${privPath}`);

  // Generate payload
  const payload = {
    generatedAt: new Date().toISOString(),
    algorithm: 'RSA-SHA256',
    files: {}
  };

  for (const fileName of PROTECTED_FILES) {
    const filePath = path.join(CONFIG_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      payload.files[fileName] = crypto.createHash('sha256').update(content).digest('hex');
      console.log(`Hashed ${fileName}: ${payload.files[fileName]}`);
    } else {
      console.warn(`Warning: ${fileName} not found.`);
    }
  }

  // Sign the payload
  console.log('Signing configuration payload...');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(JSON.stringify(payload));
  const signature = sign.sign(privateKey, 'hex');

  const signedManifest = {
    payload,
    signature
  };

  const manifestPath = path.join(CONFIG_DIR, '.integrity.signed');
  fs.writeFileSync(manifestPath, JSON.stringify(signedManifest, null, 2));
  console.log(`Successfully generated and signed ${manifestPath}`);
  
  // Clean up the old un-signed integrity file if it exists
  const oldPath = path.join(CONFIG_DIR, '.integrity');
  if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
}

generateAndSign();
