const express = require("express");
const {
  register,
  login,
  activateAccount,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// authLimiter applied only to the endpoints that are attack surfaces.
// register and login are rate-limited because they are targeted by brute-force.
// forgot-password is rate-limited to prevent OTP flooding.
// verify-otp and reset-password are not rate-limited here because the
// short-lived resetToken (10 min expiry) already limits abuse.

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/activate-account", authLimiter, activateAccount);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

module.exports = router;
