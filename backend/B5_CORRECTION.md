# B5 Correction: Email Case Insensitivity Bug (False Positive)

## Context
During the security audit (Batch 1), a vulnerability was reported (B5) regarding inconsistent email case-sensitivity in the authentication flow. The report claimed that users could register with mixed-case emails, but would fail to log in or reset passwords because Mongoose's `lowercase: true` schema setter allegedly **"does not run on query filters or updates by default"**.

To address this, explicit `.trim().toLowerCase()` sanitization was added to the `login`, `forgotPassword`, and `updateProfile` controllers.

## The Discovery (Mongoose 8.x)
During the implementation of regression tests (Batch 3, Step 2), we attempted to prove the necessity of the B5 fix by writing a test and then temporarily removing the `.trim().toLowerCase()` code to watch the test fail (Red-Green testing).

**The test did not fail.**

Further isolated testing and debugging (including `mongoose.set("debug", true)`) definitively proved that:
- The project runs on **Mongoose v8.24.1**.
- In Mongoose 8.x, schema setters like `lowercase: true` and `trim: true` **ARE applied automatically** to query filters (e.g., `findOne({ email: ... })`) and update operations (e.g., `findByIdAndUpdate(..., { email: ... })`).
- When the API received `{"email": "JANE.DOE@EXAMPLE.COM"}`, Mongoose automatically downcased it to `jane.doe@example.com` before the query was ever sent to the MongoDB native driver.

## Conclusion
The original B5 vulnerability report was a **False Positive** in the context of this specific environment. The application was already protected against case-insensitivity bugs by Mongoose 8.x's default casting behavior.

The explicit `.trim().toLowerCase()` calls added to the controllers have been retained. They serve as excellent **Defensive Programming**—ensuring the data is sanitized at the application layer without relying on ORM "magic"—but it is important for future maintainers to know that this code does not fix an active bug in this Mongoose version.

## Proof
The exact database query logged during tests when submitting an uppercase email:
```
console.log
  LOGIN ATTEMPT EMAIL IN REQ.BODY: {"email":"JANE.DOE@EXAMPLE.COM"}

console.info
  Mongoose: users.findOne({ email: 'jane.doe@example.com' }, ...)
```
