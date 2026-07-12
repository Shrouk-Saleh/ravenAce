const User = require("../models/User");
const { AppError } = require("../utils/errorUtils");

// ────────────────────────────────────────────────────────────────
// @desc    Get logged-in user's profile
// @route   GET /api/users/me
// @access  Protected (any role)
// ────────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    // req.user is already loaded by protect() middleware — no extra DB call needed
    res.status(200).json({
      status: "success",
      data: { user: req.user },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Update logged-in user's name and/or email
// @route   PUT /api/users/me
// @access  Protected (any role)
// ────────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    // Only allow safe fields here — password changes go through the auth flow.
    // runValidators: true re-runs schema validators (e.g. email format, minlength).
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully.",
      data: { user: updated },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Upload / replace profile photo
// @route   POST /api/users/me/photo
// @access  Protected (any role)
// ────────────────────────────────────────────────────────────────
// Multer middleware runs BEFORE this function and puts the file at req.file.
// If no file was uploaded (wrong field name, wrong content-type), req.file is undefined.
const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError("Please upload an image file.", 400));
    }

    // req.file.path is the full Cloudinary secure URL set by CloudinaryStorage
    const photoPath = req.file.path;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: photoPath },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Profile photo updated.",
      data: { profilePhoto: user.profilePhoto },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, uploadProfilePhoto };
