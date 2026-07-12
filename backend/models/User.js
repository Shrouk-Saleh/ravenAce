const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // NEVER returned in queries unless .select('+password') is used
    },
    role: {
      type: String,
      enum: ["student", "instructor", "admin", "organization"],
      default: "student",
      // enum rejects any value not in the list at the DB level
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profilePhoto: {
      type: String,
      default: "", // stores Cloudinary URL or relative path
    },

    // ── Organization multi-tenancy ─────────────────────────────────
    // Links students and instructors to their parent organization.
    // Null for self-registered users, admin, or org owner accounts.
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },

    // ── Invitation flow ────────────────────────────────────────────
    // When an org creates a member, a token is generated and sent via email.
    // The user activates their account by setting a password with this token.
    invitationToken: { type: String, select: false },
    invitationExpires: { type: Date, select: false },
    isInvited: {
      type: Boolean,
      default: false,
      // true = account created by org, waiting for user to set password
    },

    // OTP reset fields — hidden by default (select: false)
    passwordResetOTP: { type: String, select: false },
    passwordResetOTPExpires: { type: Date, select: false },
    passwordResetVerified: { type: Boolean, default: false, select: false },

    // Set every time the password is changed — used to invalidate
    // tokens that were issued before the most recent password change.
    // A token with iat < passwordChangedAt is rejected in protect().
    passwordChangedAt: { type: Date, select: false },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// ── Indexes ────────────────────────────────────────────────────────
userSchema.index({ organization: 1, role: 1 });

// ── Pre-save hook: hash password only when it changes ──────────────────────
// This runs before every user.save().
// isModified('password') is false on other field updates,
// so we never accidentally re-hash an already-hashed password.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  // Track when password last changed.
  // Subtract 1s to prevent a race where the JWT iat equals passwordChangedAt
  // and the comparison (iat < passwordChangedAt) incorrectly invalidates the new token.
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// ── Instance method: compare a plain password against the stored hash ──────
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);

