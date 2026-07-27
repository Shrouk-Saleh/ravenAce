const mongoose = require("mongoose");
const crypto = require("crypto");
const { encryptSecret } = require("../utils/encryptionUtils");

const integrationCredentialSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: [true, "Provider is required"],
      unique: true,
      trim: true,
    },
    keyId: {
      type: String,
      required: [true, "Key ID is required"],
      unique: true,
    },
    secretHash: {
      type: String,
      required: [true, "Secret hash is required"],
    },
    secretEncrypted: {
      type: String,
      required: [true, "Encrypted secret is required"],
    },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },
    lastUsedAt: {
      type: Date,
    },
    rotatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IntegrationCredential",
      default: null,
    },
  },
  { timestamps: true }
);

// Centralized generation to ensure secrets are always properly hashed and encrypted before storage
integrationCredentialSchema.statics.generateNew = async function (provider, rotatedFromId = null) {
  // Generate a random keyId and secret
  const keyId = `key_${crypto.randomBytes(16).toString("hex")}`;
  const rawSecret = crypto.randomBytes(32).toString("base64"); // 32 bytes of entropy

  // Hash for the fast API middleware validation
  const secretHash = crypto.createHash("sha256").update(rawSecret).digest("hex");
  
  // Encrypt for the HMAC verification usage
  const secretEncrypted = encryptSecret(rawSecret);

  const credential = await this.create({
    provider,
    keyId,
    secretHash,
    secretEncrypted,
    rotatedFrom: rotatedFromId,
  });

  // Return the raw secret ONE TIME ONLY so it can be configured in HireHub
  return { credential, rawSecret };
};

module.exports = mongoose.model("IntegrationCredential", integrationCredentialSchema);
