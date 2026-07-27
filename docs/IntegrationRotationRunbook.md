# HireHub Integration Credential Rotation Runbook

This runbook outlines the zero-downtime process for rotating the API credentials used by HireHub to communicate with RavenACE. 

Because HireHub polls RavenACE frequently, rotating the credentials must be done gracefully, keeping both the old and new credentials active temporarily.

## Step 1: Generate the New Credential
Run the automated CLI rotation script from the `backend/` directory:

```bash
cd backend
node scripts/rotateIntegrationCredential.js hirehub
```

**What this does:**
- It looks up the currently active credential for HireHub.
- It generates a new Key ID and a secure 32-byte Secret.
- It saves the new credential with `status: "active"` and links it to the old credential via the `rotatedFrom` field.
- **Crucially:** It does *not* revoke the old credential. Both will work simultaneously.

The script will output the new **KEY ID** and **SECRET**. Copy these securely.

## Step 2: Update HireHub
1. Go to the HireHub deployment (or local environment).
2. Update the `.env` file with the new credentials:
   ```env
   RAVENACE_API_KEY_ID=<NEW_KEY_ID>
   RAVENACE_API_KEY_SECRET=<NEW_SECRET>
   ```
3. Restart or redeploy the HireHub server so it begins using the new credentials.

## Step 3: Verify the Transition in the Database
Wait a few minutes (depending on HireHub's polling frequency). You must verify that HireHub has successfully switched to the new credentials before revoking the old ones.

In your MongoDB shell or compass, check the `lastUsedAt` fields for both credentials:

```javascript
db.integrationcredentials.find({ provider: "hirehub" }, { keyId: 1, status: 1, lastUsedAt: 1 }).sort({ createdAt: -1 })
```

**Expected outcome:**
- The *new* credential's `lastUsedAt` timestamp is recent and updating.
- The *old* credential's `lastUsedAt` timestamp has stopped updating.

## Step 4: Revoke the Old Credential
Once you are 100% certain no legitimate requests are still using the old credential, revoke it manually in the database. 

The rotation script outputs the exact query for this, which looks like:

```javascript
db.integrationcredentials.updateOne(
  { _id: ObjectId('<OLD_CREDENTIAL_ID>') },
  { $set: { status: 'revoked' } }
)
```

## Step 5: (Optional) Verify Rejection
If you want to be extra thorough, you can use `curl` or Postman to make a request to the data endpoint using the *old* credentials. It should now return a `401 Unauthorized`.

---

## Important Configuration Notes
- The frontend `.env` (and deployment environment variables) must include `VITE_HIREHUB_CALLBACK_URL` (e.g. `https://hirehub-production-url.com/callback`). If omitted, it will default to `http://localhost:3000/callback`.
- The backend `.env` must include `INTEGRATION_ENCRYPTION_KEY` (a 64-character hex string) for AES-256-GCM encryption of the shared secrets. Never change this key without manually re-encrypting existing secrets, or all existing HMAC verification flows will immediately fail.
