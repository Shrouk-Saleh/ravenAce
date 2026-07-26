const Question = require("../models/Question");
const Exam = require("../models/Exam");
const Attempt = require("../models/Attempt");
const { calculateScore } = require("./attemptController");
const { COMPLETED_ATTEMPT_STATUSES } = require("../utils/constants");
const { AppError } = require("../utils/errorUtils");

// ────────────────────────────────────────────────────────────────
// @desc    Get all questions in instructor's question bank
// @route   GET /api/questions
// @access  Instructor only
// Supports: ?search=keyword  and  ?category=math
// ────────────────────────────────────────────────────────────────
const getAllQuestions = async (req, res, next) => {
  try {
    const filter = { instructor: req.user._id, isDeleted: false };

    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // $regex with 'i' flag = case-insensitive partial match
      filter.text = { $regex: escapedSearch, $options: "i" };
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await Question.countDocuments(filter);
    const questions = await Question.find(filter).skip(skip).limit(limit);

    res.status(200).json({
      status: "success",
      results: questions.length,
      data: { questions, total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Create a new question in the question bank
// @route   POST /api/questions
// @access  Instructor only
// ────────────────────────────────────────────────────────────────
const createQuestion = async (req, res, next) => {
  try {
    // SECURITY: Whitelist allowed fields — same pattern as updateQuestion below.
    // Prevents mass-assignment of instructor, isDeleted, aiGenerated, etc.
    const allowedFields = [
      "text", "type", "options", "correctAnswer", "explanation",
      "modelAnswer", "gradingCriteria", "codeTemplate", "allowedLanguages",
      "timeLimit", "memoryLimit", "testCases", "maxScore",
      "category", "tags", "difficulty",
    ];
    const questionData = { instructor: req.user._id };
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) questionData[f] = req.body[f];
    });

    const question = await Question.create(questionData);

    res.status(201).json({
      status: "success",
      data: { question },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Update a question
// @route   PUT /api/questions/:id
// @access  Instructor only (own questions)
// ────────────────────────────────────────────────────────────────
const updateQuestion = async (req, res, next) => {
  try {
    // SECURITY: Whitelist allowed fields — never pass req.body directly.
    // This prevents attackers from injecting 'instructor', 'isDeleted',
    // 'aiGenerated', or any other field they shouldn't be able to change.
    const allowedFields = [
      "text", "type", "options", "correctAnswer", "explanation",
      "modelAnswer", "gradingCriteria", "codeTemplate", "allowedLanguages",
      "timeLimit", "memoryLimit", "testCases", "maxScore",
      "category", "tags", "difficulty",
    ];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const q = await Question.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!q) return next(new AppError("Question not found or not yours.", 404));

    res.status(200).json({
      status: "success",
      data: { question: q },
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Instructor only (own questions)
// ────────────────────────────────────────────────────────────────
const deleteQuestion = async (req, res, next) => {
  try {
    // Soft delete the question so past attempts can still populate and display it.
    const q = await Question.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user._id },
      { isDeleted: true },
      { new: true }
    );

    if (!q) return next(new AppError("Question not found or not yours.", 404));

    // Remove from all Exams
    await Exam.updateMany(
      { questions: req.params.id },
      { $pull: { questions: req.params.id } }
    );

    // WE DO NOT remove it from past attempts, so students keep their grades 
    // and can still see the question in the UI.

    res.status(200).json({
      status: "success",
      message: "Question deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Add an existing question to an exam (question bank reuse)
// @route   POST /api/questions/add-to-exam
// @access  Instructor only
// ────────────────────────────────────────────────────────────────
// This links a Question document to an Exam by ObjectId reference.
// The question is NOT duplicated — one Question document, many exams pointing to it.
const addToExam = async (req, res, next) => {
  try {
    const { examId, questionId } = req.body;

    const exam = await Exam.findOne({
      _id: examId,
      instructor: req.user._id,
    });
    if (!exam) return next(new AppError("Exam not found or not yours.", 404));

    const question = await Question.findOne({
      _id: questionId,
      instructor: req.user._id,
    });
    if (!question)
      return next(new AppError("Question not found or not yours.", 404));

    // $addToSet prevents the same question being added twice to the same exam
    await Exam.findByIdAndUpdate(examId, {
      $addToSet: { questions: questionId },
    });

    res.status(200).json({
      status: "success",
      message: "Question added to exam successfully.",
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Remove a question from an exam (without deleting it from the bank)
// @route   POST /api/questions/remove-from-exam
// @access  Instructor only
// ────────────────────────────────────────────────────────────────
const removeFromExam = async (req, res, next) => {
  try {
    const { examId, questionId } = req.body;

    const exam = await Exam.findOne({
      _id: examId,
      instructor: req.user._id,
    });
    if (!exam) return next(new AppError("Exam not found or not yours.", 404));

    // $pull removes the matching value from the array
    const updatedExam = await Exam.findByIdAndUpdate(examId, {
      $pull: { questions: questionId },
    }, { new: true }).populate("questions");

    // Remove from all existing student Attempts for THIS EXAM to prevent dangling references
    // and so they no longer see it in their UI
    await Attempt.updateMany(
      { exam: examId },
      {
        $pull: {
          questions: questionId,
          savedAnswers: { question: questionId },
          perQuestionResult: { question: questionId },
        },
      }
    );

    // Now recalculate the grades for all submitted attempts for this exam
    const attempts = await Attempt.find({ exam: examId, status: { $in: COMPLETED_ATTEMPT_STATUSES } });
    for (const attempt of attempts) {
      const newTotalScore = calculateScore(updatedExam.questions.filter(Boolean), attempt.perQuestionResult, updatedExam.totalScore);
      attempt.score = newTotalScore;
      attempt.passed = newTotalScore >= updatedExam.passingScore;
      await attempt.save();
    }

    res.status(200).json({
      status: "success",
      message: "Question removed from exam and grades recalculated.",
    });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────
// @desc    Get statistics for a specific question
// @route   GET /api/questions/:id/stats
// @access  Instructor only
// ────────────────────────────────────────────────────────────────
const getQuestionStats = async (req, res, next) => {
  try {
    const questionId = req.params.id;

    // Verify the question belongs to the instructor
    const question = await Question.findOne({ _id: questionId, instructor: req.user._id });
    if (!question) {
      return next(new AppError("Question not found or not yours.", 404));
    }

    // Find all submitted attempts that contain this question
    // We unwind the perQuestionResult array to easily match and project the stats
    const stats = await Attempt.aggregate([
      { $match: { status: { $in: COMPLETED_ATTEMPT_STATUSES } } },
      { $unwind: "$perQuestionResult" },
      { $match: { "perQuestionResult.question": question._id } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          correctCount: {
            $sum: { $cond: [{ $eq: ["$perQuestionResult.isCorrect", true] }, 1, 0] }
          },
          incorrectCount: {
            $sum: { $cond: [{ $eq: ["$perQuestionResult.isCorrect", false] }, 1, 0] }
          },
          totalScore: { $sum: "$perQuestionResult.score" },
          averageScore: { $avg: "$perQuestionResult.score" }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalAttempts: 0,
      correctCount: 0,
      incorrectCount: 0,
      totalScore: 0,
      averageScore: 0
    };

    res.status(200).json({
      status: "success",
      data: { stats: result }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  addToExam,
  removeFromExam,
  getQuestionStats,
};
