const crypto = require("crypto");
const User = require("../models/User");
const Organization = require("../models/Organization");
const Exam = require("../models/Exam");
const Certificate = require("../models/Certificate");
const { AppError } = require("../utils/errorUtils");
const { sendInvitation } = require("../utils/emailService");

// ────────────────────────────────────────────────────────────────
// PROFILE MANAGEMENT
// ────────────────────────────────────────────────────────────────

// @desc    Get organization profile
// @route   GET /api/organization/profile
// @access  Organization only
const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      status: "success",
      data: { organization: req.organization },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update organization profile
// @route   PUT /api/organization/profile
// @access  Organization only
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      "name", "email", "phone", "address",
      "website", "description", "industry", "country",
    ];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const org = await Organization.findByIdAndUpdate(
      req.organization._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      data: { organization: org },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload organization logo
// @route   POST /api/organization/logo
// @access  Organization only
const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError("No file uploaded.", 400));
    }
    // req.file.path is the Cloudinary secure URL (set by CloudinaryStorage)
    const org = await Organization.findByIdAndUpdate(
      req.organization._id,
      { logo: req.file.path },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Logo updated successfully.",
      data: { logo: org.logo },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────────────────────────

// @desc    Get organization dashboard stats
// @route   GET /api/organization/dashboard
// @access  Organization only
const getDashboard = async (req, res, next) => {
  try {
    const orgId = req.organization._id;

    // Count members
    const [totalStudents, totalInstructors] = await Promise.all([
      User.countDocuments({ organization: orgId, role: "student" }),
      User.countDocuments({ organization: orgId, role: "instructor" }),
    ]);

    // Get instructors to find their exams
    const instructorIds = await User.find(
      { organization: orgId, role: "instructor" },
      "_id"
    ).lean();
    const instructorIdList = instructorIds.map((i) => i._id);

    const [totalExams, totalCertificates] = await Promise.all([
      Exam.countDocuments({ instructor: { $in: instructorIdList } }),
      Certificate.countDocuments({ organization: orgId }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        totalStudents,
        totalInstructors,
        totalExams,
        totalCertificates,
        maxStudents: req.organization.maxStudents,
        maxInstructors: req.organization.maxInstructors,
        subscriptionPlan: req.organization.subscriptionPlan,
        subscriptionStatus: req.organization.subscriptionStatus,
        subscriptionEndDate: req.organization.subscriptionEndDate,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// INSTRUCTOR MANAGEMENT
// ────────────────────────────────────────────────────────────────

// @desc    Get all instructors in this organization
// @route   GET /api/organization/instructors
// @access  Organization only (active subscription)
const getInstructors = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const [instructors, total] = await Promise.all([
      User.find({
        organization: req.organization._id,
        role: "instructor",
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ organization: req.organization._id, role: "instructor" }),
    ]);

    res.status(200).json({
      status: "success",
      results: instructors.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: { instructors },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create an instructor via invitation
// @route   POST /api/organization/instructors
// @access  Organization only (active subscription)
const createInstructor = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return next(new AppError("Please provide name and email.", 400));
    }

    // Check limit
    const currentCount = await User.countDocuments({
      organization: req.organization._id,
      role: "instructor",
    });
    if (currentCount >= req.organization.maxInstructors) {
      return next(
        new AppError(
          `Instructor limit reached (${req.organization.maxInstructors}). Upgrade your plan to add more instructors.`,
          403
        )
      );
    }

    // Generate invitation token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Create user with temporary password (will be overwritten on activation)
    const tempPassword = crypto.randomBytes(16).toString("hex") + "A1!";
    const user = await User.create({
      name,
      email,
      password: tempPassword,
      role: "instructor",
      organization: req.organization._id,
      isInvited: true,
      invitationToken: hashedToken,
      invitationExpires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send invitation email
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const activationUrl = `${frontendUrl}/activate?token=${rawToken}`;
    try {
      await sendInvitation(email, name, req.organization.name, activationUrl);
    } catch (emailErr) {
      console.error("Invitation email failed:", emailErr.message);
      // Don't fail the request — user can be re-invited
    }

    res.status(201).json({
      status: "success",
      message: "Instructor created and invitation sent.",
      data: {
        instructor: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isInvited: user.isInvited,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update an instructor
// @route   PUT /api/organization/instructors/:id
// @access  Organization only
const updateInstructor = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organization: req.organization._id,
      role: "instructor",
    });
    if (!user) return next(new AppError("Instructor not found.", 404));

    const { name, email } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      data: { instructor: user },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle instructor active/disabled
// @route   PATCH /api/organization/instructors/:id/toggle
// @access  Organization only
const toggleInstructorActive = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organization: req.organization._id,
      role: "instructor",
    });
    if (!user) return next(new AppError("Instructor not found.", 404));

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      message: `Instructor ${user.isActive ? "activated" : "deactivated"}.`,
      data: { isActive: user.isActive },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete an instructor
// @route   DELETE /api/organization/instructors/:id
// @access  Organization only
const deleteInstructor = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organization: req.organization._id,
      role: "instructor",
    });
    if (!user) return next(new AppError("Instructor not found.", 404));

    // Cascade delete: remove all related records to prevent orphan data
    const Notification = require("../models/Notification");
    const CheatLog = require("../models/CheatLog");
    await Promise.all([
      Notification.deleteMany({ user: user._id }),
      CheatLog.deleteMany({ student: user._id }),
    ]);
    // Note: Attempts are NOT deleted — they are kept for audit/historical records.
    // Exams created by the instructor are also kept (instructors create content for the org).

    await user.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Instructor deleted.",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Resend invitation to an instructor
// @route   POST /api/organization/instructors/:id/resend-invite
// @access  Organization only
const resendInstructorInvite = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organization: req.organization._id,
      role: "instructor",
      isInvited: true,
    });
    if (!user) {
      return next(new AppError("Instructor not found or already activated.", 404));
    }

    // Generate new token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.invitationToken = hashedToken;
    user.invitationExpires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const activationUrl = `${frontendUrl}/activate?token=${rawToken}`;
    await sendInvitation(user.email, user.name, req.organization.name, activationUrl);

    res.status(200).json({
      status: "success",
      message: "Invitation resent.",
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// STUDENT MANAGEMENT
// ────────────────────────────────────────────────────────────────

// @desc    Get all students in this organization
// @route   GET /api/organization/students
// @access  Organization only (active subscription)
const getStudents = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const [students, total] = await Promise.all([
      User.find({
        organization: req.organization._id,
        role: "student",
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ organization: req.organization._id, role: "student" }),
    ]);

    res.status(200).json({
      status: "success",
      results: students.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: { students },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a student via invitation
// @route   POST /api/organization/students
// @access  Organization only (active subscription)
const createStudent = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return next(new AppError("Please provide name and email.", 400));
    }

    // Check limit
    const currentCount = await User.countDocuments({
      organization: req.organization._id,
      role: "student",
    });
    if (currentCount >= req.organization.maxStudents) {
      return next(
        new AppError(
          `Student limit reached (${req.organization.maxStudents}). Upgrade your plan to add more students.`,
          403
        )
      );
    }

    // Generate invitation token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const tempPassword = crypto.randomBytes(16).toString("hex") + "A1!";
    const user = await User.create({
      name,
      email,
      password: tempPassword,
      role: "student",
      organization: req.organization._id,
      isInvited: true,
      invitationToken: hashedToken,
      invitationExpires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send invitation email
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const activationUrl = `${frontendUrl}/activate?token=${rawToken}`;
    try {
      await sendInvitation(email, name, req.organization.name, activationUrl);
    } catch (emailErr) {
      console.error("Invitation email failed:", emailErr.message);
    }

    res.status(201).json({
      status: "success",
      message: "Student created and invitation sent.",
      data: {
        student: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isInvited: user.isInvited,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a student
// @route   PUT /api/organization/students/:id
// @access  Organization only
const updateStudent = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organization: req.organization._id,
      role: "student",
    });
    if (!user) return next(new AppError("Student not found.", 404));

    const { name, email } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      data: { student: user },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle student active/disabled
// @route   PATCH /api/organization/students/:id/toggle
// @access  Organization only
const toggleStudentActive = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organization: req.organization._id,
      role: "student",
    });
    if (!user) return next(new AppError("Student not found.", 404));

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      message: `Student ${user.isActive ? "activated" : "deactivated"}.`,
      data: { isActive: user.isActive },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a student
// @route   DELETE /api/organization/students/:id
// @access  Organization only
const deleteStudent = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organization: req.organization._id,
      role: "student",
    });
    if (!user) return next(new AppError("Student not found.", 404));

    // Cascade delete: remove all related records to prevent orphan data
    const Attempt = require("../models/Attempt");
    const Notification = require("../models/Notification");
    const Certificate = require("../models/Certificate");
    const CheatLog = require("../models/CheatLog");
    await Promise.all([
      Attempt.deleteMany({ student: user._id }),
      Notification.deleteMany({ user: user._id }),
      Certificate.deleteMany({ student: user._id }),
      CheatLog.deleteMany({ student: user._id }),
    ]);

    await user.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Student deleted.",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Resend invitation to a student
// @route   POST /api/organization/students/:id/resend-invite
// @access  Organization only
const resendStudentInvite = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organization: req.organization._id,
      role: "student",
      isInvited: true,
    });
    if (!user) {
      return next(new AppError("Student not found or already activated.", 404));
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.invitationToken = hashedToken;
    user.invitationExpires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const activationUrl = `${frontendUrl}/activate?token=${rawToken}`;
    await sendInvitation(user.email, user.name, req.organization.name, activationUrl);

    res.status(200).json({
      status: "success",
      message: "Invitation resent.",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadLogo,
  getDashboard,
  getInstructors,
  createInstructor,
  updateInstructor,
  toggleInstructorActive,
  deleteInstructor,
  resendInstructorInvite,
  getStudents,
  createStudent,
  updateStudent,
  toggleStudentActive,
  deleteStudent,
  resendStudentInvite,
};
