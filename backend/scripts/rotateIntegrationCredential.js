const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config({ path: "../.env" });

const IntegrationCredential = require("../models/IntegrationCredential");

const runRotation = async () => {
  const provider = process.argv[2];

  if (!provider) {
    console.error("Usage: node rotateIntegrationCredential.js <provider_name>");
    console.error("Example: node rotateIntegrationCredential.js hirehub");
    process.exit(1);
  }

  // Ensure ENCRYPTION_KEY exists
  if (!process.env.INTEGRATION_ENCRYPTION_KEY) {
    console.error("❌ ERROR: INTEGRATION_ENCRYPTION_KEY is missing from environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ravenace");

    console.log(`Starting credential rotation for provider: '${provider}'...`);

    // Find the currently active credential for this provider
    const oldCredential = await IntegrationCredential.findOne({
      provider,
      status: "active",
    });

    if (!oldCredential) {
      console.log(`No active credential found for provider '${provider}'. Creating the first one instead of rotating.`);
    } else {
      console.log(`Found active credential ID: ${oldCredential._id} (Key: ${oldCredential.keyId})`);
    }

    // Generate the new credential, pointing rotatedFrom to the old one if it exists
    const oldId = oldCredential ? oldCredential._id : null;
    const { credential, rawSecret } = await IntegrationCredential.generateNew(provider, oldId);

    console.log("\n✅ Successfully generated new active credential!");
    console.log("--------------------------------------------------");
    console.log(`NEW KEY ID : ${credential.keyId}`);
    console.log(`NEW SECRET : ${rawSecret}`);
    console.log("--------------------------------------------------");
    console.log("\n⚠️  IMPORTANT NEXT STEPS:");
    console.log("1. Add the NEW KEY ID and NEW SECRET to the external system's environment variables (.env).");
    console.log("2. Deploy the external system.");
    console.log(`3. Monitor RavenACE database. Wait for the new credential's 'lastUsedAt' to update.`);
    console.log(`4. Wait for the old credential (ID: ${oldId || "N/A"})'s 'lastUsedAt' to stop updating.`);
    console.log(`5. Manually revoke the old credential via database update:`);
    if (oldId) {
      console.log(`   db.integrationcredentials.updateOne({ _id: ObjectId('${oldId}') }, { $set: { status: 'revoked' } })`);
    }

  } catch (err) {
    console.error("Rotation failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runRotation();
