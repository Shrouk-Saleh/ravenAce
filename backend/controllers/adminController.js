// controllers/adminController.js
const User = require("../models/User");
const Exam = require("../models/Exam");
const Attempt = require("../models/Attempt");
const Organization = require("../models/Organization");
const { AppError } = require("../utils/errorUtils");

// ────────────────────────────────────────────────────────────────
// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin only
// ────────────────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();
    const users = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit);

    res.status(200).json({
      status: "success",
      results: users.length,
      data: { users, total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Update a user's role
// @route   PATCH /api/admin/users/:id/role
// @access  Admin only
// ────────────────────────────────────────────────────────────────
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["student", "instructor", "admin", "organization"].includes(role)) {
      return next(new AppError("Invalid role.", 400));
    }

    if (req.params.id === req.user._id.toString() && role !== "admin") {
      return next(new AppError("You cannot change your own role.", 400));
    }

    if (role !== "admin") {
      const targetUser = await User.findById(req.params.id);
      if (targetUser && targetUser.role === "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          return next(new AppError("Cannot remove the last admin.", 400));
        }
      }
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    if (!user) return next(new AppError("User not found.", 404));

    if (role === "organization") {
      const existingOrg = await Organization.findOne({ owner: user._id });
      if (!existingOrg) {
        await Organization.create({
          owner: user._id,
          name: user.name,
          email: user.email,
        });
      }
    }

    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Toggle user active/disabled
// @route   PATCH /api/admin/users/:id/toggle-active
// @access  Admin only
// ────────────────────────────────────────────────────────────────
const toggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found.", 404));
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({
      status: "success",
      message: `User ${user.isActive ? "enabled" : "disabled"}.`,
      data: { isActive: user.isActive },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Delete a user permanently
// @route   DELETE /api/admin/users/:id
// @access  Admin only
// ────────────────────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return next(new AppError("You cannot delete your own account.", 400));
    }
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found.", 404));

    // ── Cascade Delete ───────────────────────────────────────────────────────
    // Remove all related data to prevent orphan records in the database.
    const Attempt = require("../models/Attempt"); // already imported at top
    const Notification = require("../models/Notification");
    const Certificate = require("../models/Certificate");
    const CheatLog = require("../models/CheatLog");

    await Promise.all([
      Attempt.deleteMany({ student: user._id }),
      Notification.deleteMany({ user: user._id }),
      Certificate.deleteMany({ student: user._id }),
      CheatLog.deleteMany({ student: user._id }),
    ]);

    // If the user was an org owner, deactivate their Organization
    if (user.role === "organization") {
      const Organization = require("../models/Organization");
      // Nullify all members' org reference so they don't point to a ghost org
      await User.updateMany({ organization: { $ne: null } }, [
        // Only clear if their org's owner was this user
        // We find the org first, then bulk-update
      ]);
      const org = await Organization.findOne({ owner: user._id });
      if (org) {
        // Unpublish exams owned by the org's instructors before they become "public"
        const orgInstructorIds = await User.find({ organization: org._id }).distinct("_id");
        await Exam.updateMany(
          { instructor: { $in: orgInstructorIds } },
          { $set: { isPublished: false } }
        );

        // Remove org link from all member accounts
        await User.updateMany({ organization: org._id }, { $set: { organization: null } });
        await org.deleteOne();
      }
    }

    await user.deleteOne();
    res.status(200).json({ status: "success", message: "User and all related data deleted." });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get ALL exams from ALL instructors (admin view)
// @route   GET /api/admin/exams
// @access  Admin only
// ────────────────────────────────────────────────────────────────
const getAllExamsAdmin = async (req, res, next) => {
  try {
    const exams = await Exam.find()
      .populate("instructor", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({
      status: "success",
      results: exams.length,
      data: { exams },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Delete any exam (admin override)
// @route   DELETE /api/admin/exams/:id
// @access  Admin only
// ────────────────────────────────────────────────────────────────
const deleteExamAdmin = async (req, res, next) => {
  try {
    const attemptCount = await Attempt.countDocuments({ exam: req.params.id });
    if (attemptCount > 0) {
      return next(new AppError(`This exam has ${attemptCount} attempts and cannot be deleted; unpublish it instead.`, 400));
    }

    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return next(new AppError("Exam not found.", 404));
    res.status(200).json({ status: "success", message: "Exam deleted by admin." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  toggleUserActive,
  deleteUser,
  getAllExamsAdmin,
  deleteExamAdmin,
};
