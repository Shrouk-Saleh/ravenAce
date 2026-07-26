const Exam = require("../models/Exam");
const Attempt = require("../models/Attempt");
const { AppError } = require("../utils/errorUtils");
const { notifyAllStudents } = require("./notificationController");
// ────────────────────────────────────────────────────────────────
// @desc    Get all exams (role-filtered)
// @route   GET /api/exams
// @access  Protected (any role)
// ────────────────────────────────────────────────────────────────
// Students  → only published exams (scoped to their org if they have one)
// Instructors → only their own exams (published + drafts)
// Admins    → all exams from all instructors
const getAllExams = async (req, res, next) => {
  try {
    let exams;

    if (req.user.role === "instructor") {
      exams = await Exam.find({ instructor: req.user._id }).populate(
        "instructor",
        "name email"
      );
    } else if (req.user.role === "admin") {
      exams = await Exam.find().populate("instructor", "name email");
    } else {
      // student
      const User = require("../models/User");
      const student = await User.findById(req.user._id);

      if (student.organization) {
        // If student is in an org, only show exams from instructors in that org
        const orgInstructors = await User.find({
          organization: student.organization,
          role: "instructor"
        }).select("_id");
        
        const instructorIds = orgInstructors.map(i => i._id);
        
        exams = await Exam.find({ 
          isPublished: true,
          instructor: { $in: instructorIds }
        }).populate("instructor", "name");
      } else {
        // If no org, show exams from instructors who also have no org (public exams)
        const publicInstructors = await User.find({
          organization: null,
          role: "instructor"
        }).select("_id");
        
        const publicInstructorIds = publicInstructors.map(i => i._id);

        exams = await Exam.find({ 
          isPublished: true,
          instructor: { $in: publicInstructorIds }
        }).populate("instructor", "name");
      }
    }

    res.status(200).json({
      status: "success",
      results: exams.length,
      data: { exams },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get single exam with all questions populated
// @route   GET /api/exams/:id
// @access  Protected (any role)
// ────────────────────────────────────────────────────────────────
const getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("instructor", "name organization")
      .populate("questions");

    if (!exam) return next(new AppError("Exam not found.", 404));
    if (!exam.instructor) return next(new AppError("Exam not found.", 404));

    // Fetch full user to get their organization
    const User = require("../models/User");
    const reqUser = await User.findById(req.user._id);

    // Multi-tenant check helper
    const isAuthorizedForOrg = () => {
      if (reqUser.organization) {
        return exam.instructor.organization && exam.instructor.organization.toString() === reqUser.organization.toString();
      } else {
        return !exam.instructor.organization;
      }
    };

    if (req.user.role === 'student') {
      if (!exam.isPublished) return next(new AppError("Exam not found.", 404));
      
      if (!isAuthorizedForOrg()) {
        return next(new AppError("Not authorized to view this exam.", 403));
      }

      // Filter out nulls and remove correct answers and explanations
      exam.questions = exam.questions.filter(Boolean).map(q => {
        const qObj = q.toObject ? q.toObject() : q;
        delete qObj.correctAnswer;
        delete qObj.explanation;
        return qObj;
      });
    } else if (req.user.role === 'instructor') {
      if (!exam.isPublished && exam.instructor._id.toString() !== req.user._id.toString()) {
        return next(new AppError("Not authorized to view this draft.", 403));
      }
      
      if (exam.instructor._id.toString() !== req.user._id.toString() && !isAuthorizedForOrg()) {
         return next(new AppError("Not authorized to view this exam.", 403));
      }

      exam.questions = exam.questions.filter(Boolean);
    } else {
      // admin
      exam.questions = exam.questions.filter(Boolean);
    }

    res.status(200).json({
      status: "success",
      data: { exam },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Create a new exam (starts as draft — isPublished: false)
// @route   POST /api/exams
// @access  Instructor only
// ────────────────────────────────────────────────────────────────
const createExam = async (req, res, next) => {
  try {
    // SECURITY: Whitelist allowed fields — never spread req.body directly.
    // This prevents an instructor from injecting isPublished:true to bypass
    // the draft requirement, or injecting a pre-populated 'questions' array.
    const { title, description, category, duration, totalScore, passingScore, maxAttempts, shuffle } = req.body;

    const exam = await Exam.create({
      title, description, category, duration, totalScore, passingScore,
      maxAttempts, shuffle,
      instructor: req.user._id, // always from token — never from req.body
      isPublished: false,        // new exams always start as drafts
    });

    res.status(201).json({
      status: "success",
      data: { exam },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Update an exam (instructor can only update their own)
// @route   PUT /api/exams/:id
// @access  Instructor only
// ────────────────────────────────────────────────────────────────
const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      instructor: req.user._id,
    });

    if (!exam) {
      return next(new AppError("Exam not found or you do not own it.", 404));
    }

    const { title, description, category, duration, totalScore, passingScore, maxAttempts, shuffle } = req.body;

    const updates = { title, description, category, duration, totalScore, passingScore, maxAttempts, shuffle };
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        exam[key] = updates[key];
      }
    });

    await exam.save();

    res.status(200).json({
      status: "success",
      data: { exam },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Toggle publish / unpublish an exam
// @route   PATCH /api/exams/:id/publish
// @access  Instructor only
// ────────────────────────────────────────────────────────────────
const togglePublish = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      instructor: req.user._id,
    });

    if (!exam) {
      return next(new AppError("Exam not found or you do not own it.", 404));
    }

    exam.isPublished = !exam.isPublished;
    await exam.save();

    // When publishing, notify all students in the same organization (or public students)
    if (exam.isPublished) {
      try {
        const User = require("../models/User");
        const instructor = await User.findById(req.user._id);

        await notifyAllStudents(
          "new-exam",
          `New exam available: "${exam.title}". Check it out!`,
          exam._id,
          instructor.organization
        );
      } catch (e) {
        console.error("Notify students failed:", e.message);
      }
    }

    res.status(200).json({
      status: "success",
      message: `Exam is now ${exam.isPublished ? "published" : "unpublished"}.`,
      data: { isPublished: exam.isPublished },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Delete an exam
// @route   DELETE /api/exams/:id
// @access  Instructor (own exams) or Admin (any exam)
// ────────────────────────────────────────────────────────────────
const deleteExam = async (req, res, next) => {
  try {
    const filter =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, instructor: req.user._id };

    const exam = await Exam.findOne(filter);
    if (!exam) {
      return next(new AppError("Exam not found or you do not own it.", 404));
    }

    const attemptCount = await Attempt.countDocuments({ exam: req.params.id });
    if (attemptCount > 0) {
      return next(new AppError(`This exam has ${attemptCount} attempts and cannot be deleted; unpublish it instead.`, 400));
    }

    await Exam.deleteOne({ _id: exam._id });

    // ── Orphan Question Cleanup ─────────────────────────────────────────────
    // For each question that was in this exam, check if any OTHER exam still
    // uses it. If not, soft-delete it so it no longer clutters the question bank.
    // We use soft-delete (isDeleted:true) not hard-delete, to preserve
    // historical attempt records that reference these questions.
    const Question = require("../models/Question");
    for (const qId of exam.questions) {
      const otherExamCount = await Exam.countDocuments({ questions: qId });
      if (otherExamCount === 0) {
        await Question.findByIdAndUpdate(qId, { isDeleted: true });
      }
    }

    res.status(200).json({
      status: "success",
      message: "Exam deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllExams,
  getExamById,
  createExam,
  updateExam,
  togglePublish,
  deleteExam,
};
