const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("../utils/errorUtils");

// ── protect: verifies JWT and attaches req.user ────────────────────────────
// Every protected route calls this first.
// It reads the token from the Authorization header, verifies the signature,
// then loads the user fresh from the database so that isActive changes
// (e.g. admin disabling an account) take effect on the next request.
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return next(new AppError("Not authenticated. Please log in.", 401));
    }

    const token = header.split(" ")[1];

    // jwt.verify throws JsonWebTokenError or TokenExpiredError on failure.
    // globalErrorHandler catches those and returns a clean 401 message.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load user fresh from DB — if admin deactivated the account mid-session,
    // the old token would still pass verification, but this check catches it.
    const user = await User.findById(decoded.id).select("+passwordChangedAt");
    if (!user) return next(new AppError("User no longer exists.", 401));
    if (!user.isActive)
      return next(new AppError("Account is deactivated. Contact admin.", 403));

    // Reject tokens issued BEFORE the user last changed their password.
    // This invalidates any stolen token after the user secures their account.
    if (user.passwordChangedAt) {
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAtSeconds) {
        return next(new AppError("Password recently changed. Please log in again.", 401));
      }
    }

    req.user = user; // downstream controllers can read req.user._id, .role, etc.
    if (decoded.sessionType) {
      req.user.sessionType = decoded.sessionType;
    }
    next();
  } catch (err) {
    return next(new AppError("Invalid or expired token. Please log in again.", 401));
  }
};

// ── authorize: role-based guard — always used AFTER protect() ─────────────
// Usage: router.post('/create', protect, authorize('instructor'), handler)
// The spread operator allows passing one or more allowed roles.
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Role '${req.user.role}' is not allowed to perform this action.`,
          403
        )
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
