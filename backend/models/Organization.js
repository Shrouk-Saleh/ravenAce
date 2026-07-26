const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    // The user account with role "organization" that owns this org
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ── Profile fields ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    logo: { type: String, default: "" }, // Cloudinary URL
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    website: { type: String, default: "" },
    description: { type: String, default: "" },
    industry: { type: String, default: "" },
    country: { type: String, default: "" },

    // ── Subscription fields ─────────────────────────────────────────
    subscriptionPlan: {
      type: String,
      enum: ["none", "standard", "premium"],
      default: "none",
    },
    subscriptionStatus: {
      type: String,
      enum: ["inactive", "active", "past_due", "canceled"],
      default: "inactive",
    },
    stripeCustomerId: { type: String, default: "" },
    stripeSubscriptionId: { type: String, default: "" },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },

    // ── Plan limits (denormalized for fast checks) ──────────────────
    // 0 = no subscription, 100 = standard, 999999 = premium (unlimited)
    maxStudents: { type: Number, default: 0 },
    maxInstructors: { type: Number, default: 0 },
    overLimitSinceDowngrade: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for quick lookups
organizationSchema.index({ stripeCustomerId: 1 });

module.exports = mongoose.model("Organization", organizationSchema);
