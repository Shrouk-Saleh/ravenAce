// controllers/certificateController.js
// Certificates are auto-created by the submit flow.
// This controller handles:
//   - listing a student's certificates
//   - public verification by certId (no login needed)
//   - creating a certificate after a passing attempt

const Certificate = require("../models/Certificate");
const Attempt     = require("../models/Attempt");
const { AppError } = require("../utils/errorUtils");

// ────────────────────────────────────────────────────────────────
// @desc    Auto-create a certificate when a student passes
//          Called internally by the submit flow — not a route itself.
// ────────────────────────────────────────────────────────────────
const createCertificateIfPassed = async (attempt) => {
  // Only create if the student passed
  if (!attempt.passed) return null;

  try {
    // Check if the student belongs to an organization to add org branding
    const student = await require("../models/User").findById(attempt.student);
    
    const cert = await Certificate.create({
      student: attempt.student,
      exam:    attempt.exam,
      attempt: attempt._id,
      score:   attempt.score,
      organization: student?.organization || null,
    });
    return cert;
  } catch (err) {
    if (err.code === 11000) {
      // E11000 unique constraint fired: certificate for this attempt already exists
      return await Certificate.findOne({ attempt: attempt._id });
    }
    throw err;
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get all certificates for the logged-in student
// @route   GET /api/certificates/mine
// @access  Student only
// ────────────────────────────────────────────────────────────────
const getMyCertificates = async (req, res, next) => {
  try {
    const certs = await Certificate.find({ student: req.user._id })
      .populate("exam",    "title category description instructor certificateIssuerName")
      .populate("student", "name email")
      .populate("organization", "name logo")
      .populate({
        path: "exam",
        populate: { path: "instructor", select: "name" },
      })
      .sort({ issuedAt: -1 });

    res.status(200).json({
      status: "success",
      results: certs.length,
      data: { certificates: certs },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get one certificate by its certId (public — no login needed)
// @route   GET /api/certificates/verify/:certId
// @access  Public
// ────────────────────────────────────────────────────────────────
const verifyCertificate = async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({ certId: req.params.certId })
      .populate("student", "name email profilePhoto")
      .populate("exam",    "title category description instructor certificateIssuerName")
      .populate("organization", "name logo")
      .populate({
        path: "exam",
        populate: { path: "instructor", select: "name" },
      });

    if (!cert) {
      // Bypassing AppError here intentionally to return a custom shape with `data.valid: false`
      // which the frontend specifically relies on to render the "Invalid Certificate" UI
      return res.status(404).json({
        status: "fail",
        message: "Certificate not found. This ID is invalid or has been revoked.",
        data: { valid: false },
      });
    }

    res.status(200).json({
      status: "success",
      message: "Certificate is valid.",
      data: { valid: true, certificate: cert },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get one certificate by its MongoDB _id (for download page)
// @route   GET /api/certificates/:id
// @access  Student (own) or Admin
// ────────────────────────────────────────────────────────────────
const getCertificateById = async (req, res, next) => {
  try {
    const cert = await Certificate.findById(req.params.id)
      .populate("student", "name email profilePhoto")
      .populate("exam",    "title category instructor certificateIssuerName")
      .populate("organization", "name logo")
      .populate({
        path: "exam",
        populate: { path: "instructor", select: "name" },
      });

    if (!cert) return next(new AppError("Certificate not found.", 404));

    // Only the owner or admin can fetch a certificate directly
    if (
      req.user.role !== "admin" &&
      cert.student._id.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorized.", 403));
    }

    res.status(200).json({
      status: "success",
      data: { certificate: cert },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCertificateIfPassed,
  getMyCertificates,
  verifyCertificate,
  getCertificateById,
};
