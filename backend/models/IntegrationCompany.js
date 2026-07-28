const mongoose = require("mongoose");

const integrationCompanySchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ["hirehub"], // Extensible for future integrations
    },
    externalCompanyId: {
      type: String,
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    systemInstructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a company from a specific provider is mapped exactly once
integrationCompanySchema.index({ provider: 1, externalCompanyId: 1 }, { unique: true });

module.exports = mongoose.model("IntegrationCompany", integrationCompanySchema);
