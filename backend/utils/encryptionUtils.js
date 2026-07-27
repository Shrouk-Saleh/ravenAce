const crypto = require("crypto");
const { AppError } = require("./errorUtils");

// Must be exactly 32 bytes (64 hex characters)
const getEncryptionKey = () => {
  const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY environment variable is missing.");
  }
  const keyBuffer = Buffer.from(keyHex, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters) for AES-256.");
  }
  return keyBuffer;
};

const encryptSecret = (plaintext) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV
  
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: ivHex:authTagHex:encryptedHex
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};

const decryptSecret = (encryptedString) => {
  try {
    const key = getEncryptionKey();
    const parts = encryptedString.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted string format.");
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    // If the auth tag is invalid (data tampered) or key is wrong, 
    // decipher.final() will synchronously throw an exception.
    decrypted += decipher.final("utf8"); 
    
    return decrypted;
  } catch (err) {
    // Catch standard crypto errors ("Unsupported state or unable to authenticate data")
    // and format issues, turning them into a clean AppError that globalErrorHandler understands
    throw new AppError("Credential decryption failed. The credential may be corrupted or the encryption key changed.", 500);
  }
};

module.exports = {
  encryptSecret,
  decryptSecret,
};
