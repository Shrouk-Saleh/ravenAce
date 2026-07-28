const mongoose = require("mongoose");

const examInvitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "consumed", "expired"],
      default: "pending",
    },
    ravenAceUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Populated when the invitation is consumed
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },

    // ── OTP fields for new-user registration via invitation ──
    // These adapt the same pattern used in the User model for password resets,
    // avoiding the creation of unverified "zombie" users.
    registrationOTP: { type: String, select: false },
    registrationOTPExpires: { type: Date, select: false },
    registrationOTPVerified: { type: Boolean, default: false, select: false },
    
    // Temporary storage for user creation during Case B flow
    tempName: { type: String, select: false },
    tempPasswordEncrypted: { type: String, select: false },
  },
  { timestamps: true }
);

// An email should only have one active invitation per exam.
// We can index (email, examId) but it shouldn't be strictly unique if we allow re-invites after expiration.
// We will handle logic in the controller to not send duplicates if a pending one exists.
examInvitationSchema.index({ email: 1, examId: 1 });
examInvitationSchema.index({ tokenHash: 1 });

module.exports = mongoose.model("ExamInvitation", examInvitationSchema);
