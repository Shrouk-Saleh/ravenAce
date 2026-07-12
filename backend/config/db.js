const mongoose = require("mongoose");

// Connects Mongoose to MongoDB using the URI from .env
// We crash on startup if the connection fails — better to fail loudly
// than to run a server that silently can't talk to the database.
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
