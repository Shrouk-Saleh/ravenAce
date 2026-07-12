const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: { type: String, default: "" },
    category: { type: String, default: "" },

    // instructor is always set from req.user._id — never from req.body
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    duration: {
      type: Number,
      required: [true, "Duration is required"], // in minutes
      min: [1, "Duration must be at least 1 minute"],
    },
    totalScore: {
      type: Number,
      required: [true, "Total score is required"],
      min: [1, "Total score must be at least 1"],
    },
    passingScore: {
      type: Number,
      required: [true, "Passing score is required"],
      min: [0, "Passing score cannot be negative"],
    },
    maxAttempts: { type: Number, default: 1, min: [1, "Max attempts must be at least 1"] },
    shuffle: { type: Boolean, default: false }, // shuffle question order per attempt

    isPublished: { type: Boolean, default: false }, // drafts start as false

    // Questions stored as ObjectId references — not embedded.
    // This allows the same question to appear in multiple exams (question bank).
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  },
  { timestamps: true }
);

examSchema.pre('validate', function (next) {
  if (this.passingScore > this.totalScore) {
    return next(new Error('Passing score cannot be greater than total score.'));
  }
  next();
});

module.exports = mongoose.model("Exam", examSchema);
