// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["result", "certificate", "new-exam", "system"],
      required: true,
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    // Optional link back to the related resource
    refId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
