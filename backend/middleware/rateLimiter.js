const rateLimit = require("express-rate-limit");

// Strict limiter for login and register.
// 10 failed attempts from one IP and the IP is blocked for 15 minutes.
// Applied only to auth endpoints — not to every route — so students
// can still load exam pages after many requests.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 10 : 1000, // 10 in production, 1000 in development
  message: {
    status: "fail",
    message: "Too many attempts from this IP. Please wait 15 minutes and try again.",
  },
  standardHeaders: true,  // sends X-RateLimit-Limit and X-RateLimit-Remaining headers
  legacyHeaders: false,
});

// Softer limiter for general API routes (optional — can be applied in server.js)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: {
    status: "fail",
    message: "Too many requests from this IP. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
