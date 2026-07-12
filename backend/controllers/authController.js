const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Organization = require("../models/Organization");
const generateToken = require("../utils/generateToken");
const { AppError } = require("../utils/errorUtils");
const { sendOTP, sendInvitation } = require("../utils/emailService");

// ────────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, orgName } = req.body;

    if (!name || !email || !password) {
      return next(new AppError("Please provide name, email, and password.", 400));
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError("Please provide a valid email.", 400));
    }
    if (password.length < 6) {
      return next(new AppError("Password must be at least 6 characters.", 400));
    }

    // Prevent self-assigning admin — only student, instructor, and organization are allowed.
    // Admin accounts are created directly in the database or promoted by another admin.
    let safeRole = "student";
    if (role === "instructor") safeRole = "instructor";
    if (role === "organization") safeRole = "organization";

    // Organization registration requires an org name
    if (safeRole === "organization" && !orgName) {
      return next(new AppError("Please provide an organization name.", 400));
    }

    // User.create() triggers the pre-save hook which hashes the password automatically.
    const user = await User.create({ name, email, password, role: safeRole });

    // If registering as an organization, auto-create the Organization document
    if (safeRole === "organization") {
      await Organization.create({
        owner: user._id,
        name: orgName,
        email: email,
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      status: "success",
      message: "Account created successfully",
      token,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Login user and return JWT
// @route   POST /api/auth/login
// @access  Public  (rate limited — 10 attempts / 15 min)
// ────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password.", 400));
    }

    // .select('+password') overrides the 'select: false' on the schema.
    // Without it, user.password is undefined and bcrypt compare fails silently.
    const user = await User.findOne({ email }).select("+password");

    // Timing attack prevention:
    // If we return immediately for unknown emails (skipping the slow bcrypt step),
    // an attacker can enumerate valid emails by measuring response time.
    // Running a dummy compare makes both paths take the same amount of time.
    const dummyHash =
      "$2a$10$abcdefghijklmnopqrstuvuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu";
    const isMatch = user
      ? await user.comparePassword(password)
      : await bcrypt.compare(password, dummyHash);

    // Same error message for wrong email AND wrong password.
    // Never tell an attacker which one was wrong.
    if (!user || !isMatch) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Block invited users who haven't activated yet
    if (user.isInvited) {
      return next(
        new AppError(
          "Your account has not been activated yet. Please check your email for the activation link.",
          403
        )
      );
    }

    // Check isActive AFTER password verification — checking it before would
    // reveal whether an email exists by returning a different error message.
    if (!user.isActive) {
      return next(
        new AppError("Your account has been deactivated. Contact admin.", 403)
      );
    }

    const token = generateToken(user._id);

    // Build response data
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
    };

    // If the user is an org owner, include org data
    if (user.role === "organization") {
      const org = await Organization.findOne({ owner: user._id });
      if (org) {
        userData.organization = {
          _id: org._id,
          name: org.name,
          logo: org.logo,
          subscriptionPlan: org.subscriptionPlan,
          subscriptionStatus: org.subscriptionStatus,
        };
      }
    }

    // If the user belongs to an org (student/instructor created by org)
    if (user.organization) {
      const org = await Organization.findById(user.organization);
      if (org) {
        userData.organizationId = org._id;
        userData.organizationName = org.name;
      }
    }

    res.status(200).json({
      status: "success",
      message: "Logged in successfully",
      token,
      data: { user: userData },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Activate an invited account — user sets their password
// @route   POST /api/auth/activate-account
// @access  Public (requires valid invitation token)
// ────────────────────────────────────────────────────────────────
const activateAccount = async (req, res, next) => {
  try {
    const { token: inviteToken, password, confirmPassword } = req.body;

    if (!inviteToken || !password || !confirmPassword) {
      return next(
        new AppError("Please provide token, password, and confirmPassword.", 400)
      );
    }
    if (password !== confirmPassword) {
      return next(new AppError("Passwords do not match.", 400));
    }
    if (password.length < 6) {
      return next(
        new AppError("Password must be at least 6 characters.", 400)
      );
    }

    // Hash the incoming token and compare to stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(inviteToken)
      .digest("hex");

    const user = await User.findOne({
      invitationToken: hashedToken,
      invitationExpires: { $gt: Date.now() },
      isInvited: true,
    }).select("+invitationToken +invitationExpires");

    if (!user) {
      return next(
        new AppError(
          "Invalid or expired invitation token. Please ask your organization to resend the invitation.",
          400
        )
      );
    }

    // Set password and clear invitation fields
    user.password = password;
    user.isInvited = false;
    user.invitationToken = undefined;
    user.invitationExpires = undefined;
    user.isActive = true;
    await user.save();

    const jwtToken = generateToken(user._id);

    res.status(200).json({
      status: "success",
      message: "Account activated successfully. You can now log in.",
      token: jwtToken,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Send OTP to email for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
// ────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError("Please provide your email.", 400));

    const user = await User.findOne({ email });

    // Always respond with success — never reveal whether the email exists.
    // This prevents attackers from using this endpoint to enumerate accounts.
    if (!user) {
      return res.status(200).json({
        status: "success",
        message: "If this email is registered, an OTP has been sent.",
      });
    }

    // Generate a 6-digit OTP, hash it, and store the HASH in the database.
    // The plain OTP is only sent via email — if the DB is compromised,
    // the stored hash is useless to an attacker.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    user.passwordResetOTP = hashedOTP;
    user.passwordResetOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.passwordResetVerified = false;

    // validateBeforeSave: false skips required-field validators because
    // we are only updating OTP fields, not the whole document.
    await user.save({ validateBeforeSave: false });

    try {
      await sendOTP(user.email, otp);
    } catch (emailErr) {
      // If the email fails, clear the OTP so the user can try again cleanly.
      user.passwordResetOTP = undefined;
      user.passwordResetOTPExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new AppError("Failed to send OTP. Please try again.", 500));
    }

    res.status(200).json({
      status: "success",
      message: "If this email is registered, an OTP has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Verify OTP — returns a short-lived resetToken on success
// @route   POST /api/auth/verify-reset-otp
// @access  Public
// ────────────────────────────────────────────────────────────────
const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return next(new AppError("Please provide email and OTP.", 400));
    }

    // Explicitly select the hidden OTP fields (select: false on schema)
    const user = await User.findOne({ email }).select(
      "+passwordResetOTP +passwordResetOTPExpires +passwordResetVerified"
    );

    if (!user || !user.passwordResetOTP) {
      return next(new AppError("No OTP was requested for this email.", 400));
    }

    // Check expiry before comparing — avoid unnecessary hash computation
    if (Date.now() > user.passwordResetOTPExpires) {
      user.passwordResetOTP = undefined;
      user.passwordResetOTPExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new AppError("OTP has expired. Please request a new one.", 400));
    }

    // Hash the incoming OTP and compare to the stored hash
    const hashedIncoming = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    if (hashedIncoming !== user.passwordResetOTP) {
      return next(new AppError("Invalid OTP.", 400));
    }

    // Mark as verified — resetPassword checks this flag
    user.passwordResetVerified = true;
    await user.save({ validateBeforeSave: false });

    // Issue a short-lived JWT with purpose:'reset_password'.
    // The resetPassword endpoint checks this purpose field so that
    // a normal login token cannot be used to reset a password.
    const resetToken = jwt.sign(
      { id: user._id, purpose: "reset_password" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.status(200).json({
      status: "success",
      message: "OTP verified. You may now reset your password.",
      resetToken, // frontend sends this in Authorization header for the next step
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Reset password after OTP has been verified
// @route   POST /api/auth/reset-password
// @access  Public + resetToken in Authorization header
// ────────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return next(
        new AppError("Please provide newPassword and confirmPassword.", 400)
      );
    }
    if (newPassword !== confirmPassword) {
      return next(new AppError("Passwords do not match.", 400));
    }
    if (newPassword.length < 6) {
      return next(
        new AppError("Password must be at least 6 characters.", 400)
      );
    }

    // Extract the resetToken from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Reset token required.", 401));
    }
    const resetToken = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return next(new AppError("Reset token is invalid or expired.", 401));
    }

    // The purpose field distinguishes reset tokens from normal login tokens.
    // Without this check, any valid login JWT could reset a password.
    if (decoded.purpose !== "reset_password") {
      return next(new AppError("Invalid reset token.", 401));
    }

    const user = await User.findById(decoded.id).select(
      "+passwordResetVerified"
    );
    if (!user) return next(new AppError("User not found.", 404));

    // Ensure the OTP step was actually completed
    if (!user.passwordResetVerified) {
      return next(new AppError("Please verify your OTP first.", 403));
    }

    // Assigning to user.password triggers the pre-save hash hook automatically.
    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    user.passwordResetVerified = false;
    await user.save();

    // Log the user in immediately by returning a normal login token
    const token = generateToken(user._id);

    res.status(200).json({
      status: "success",
      message: "Password reset successfully.",
      token,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  activateAccount,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};
