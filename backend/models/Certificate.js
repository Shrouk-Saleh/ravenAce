// models/Certificate.js
// A certificate is created the moment a student passes an exam.
// The certId is a UUID stored as a plain string — used for public verification.
// Anyone can verify a certificate by its certId without logging in.

const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const certificateSchema = new mongoose.Schema(
  {
    certId:  { type: String, default: uuidv4, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    exam:    { type: mongoose.Schema.Types.ObjectId, ref: "Exam",    required: true },
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: "Attempt", required: true, unique: true },
    score:   { type: Number, required: true },
    issuedAt:{ type: Date,   default: Date.now },

    // Optional — set when the student belongs to an organization.
    // Enables org-branded certificates (logo, org name on the cert).
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Certificate", certificateSchema);

