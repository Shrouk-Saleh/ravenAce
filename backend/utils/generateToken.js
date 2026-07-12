const jwt = require("jsonwebtoken");

// Signs a JWT with the user's MongoDB _id as the payload.
// Centralised here so if we ever change the algorithm or expiry,
// we change it in one place, not in every controller.
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;
