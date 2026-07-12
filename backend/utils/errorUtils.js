// AppError is a custom Error subclass that also carries an HTTP status code.
// By throwing AppError instead of a plain Error, every handler knows exactly
// what status code to send without adding if/else logic everywhere.
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? "error" : "fail";
    this.isOperational = true; // flag: we threw this intentionally
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler — Express identifies this by the 4-parameter signature.
// It must be registered LAST in server.js (after all routes).
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Mongoose duplicate key error (e.g. duplicate email on register)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err.statusCode = 409;
    err.message = `${field} is already registered.`;
  }

  // Mongoose schema validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    err.statusCode = 400;
    err.message = messages.join(". ");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    err.statusCode = 401;
    err.message = "Invalid token. Please log in again.";
  }
  if (err.name === "TokenExpiredError") {
    err.statusCode = 401;
    err.message = "Token has expired. Please log in again.";
  }

  // Multer upload errors
  if (err.name === "MulterError") {
    err.statusCode = 400;
    err.message = err.code === "LIMIT_FILE_SIZE"
      ? "File too large. Maximum size is 10MB."
      : err.message;
  }
  if (err.message && err.message.includes("Only JPEG, PNG, and WebP")) {
    err.statusCode = 400;
  }

  res.status(err.statusCode).json({
    status: err.status || "error",
    message: err.message,
  });
};

module.exports = { AppError, globalErrorHandler };
