const crypto = require("crypto");
const IntegrationCredential = require("../models/IntegrationCredential");
const { AppError } = require("../utils/errorUtils");

const integrationAuth = async (req, res, next) => {
  try {
    const keyId = req.headers["x-api-key-id"];
    const secret = req.headers["x-api-key-secret"];

    if (!keyId || !secret) {
      return next(new AppError("Missing API Key credentials", 401));
    }

    const credential = await IntegrationCredential.findOne({ keyId, status: "active" });
    
    if (!credential) {
      // Generic 401 to prevent leaking info about key existence
      return next(new AppError("Invalid or revoked API Key", 401));
    }

    // Hash the incoming secret using SHA-256 to compare with the stored secretHash
    const incomingSecretHashBuffer = crypto.createHash("sha256").update(secret).digest();
    const storedSecretHashBuffer = Buffer.from(credential.secretHash, "hex");

    // Ensure buffers are the same length before comparing to avoid errors in timingSafeEqual
    if (
      incomingSecretHashBuffer.length !== storedSecretHashBuffer.length ||
      !crypto.timingSafeEqual(incomingSecretHashBuffer, storedSecretHashBuffer)
    ) {
      return next(new AppError("Invalid or revoked API Key", 401));
    }

    // Auth succeeded: Update lastUsedAt without triggering full save hooks (fast)
    await IntegrationCredential.updateOne(
      { _id: credential._id },
      { $set: { lastUsedAt: new Date() } }
    );

    // Attach integration context to the request for the controllers
    req.integration = { provider: credential.provider };
    
    next();
  } catch (err) {
    console.error("Integration Auth Error:", err);
    return next(new AppError("API Key authentication failed", 401));
  }
};

module.exports = { integrationAuth };
