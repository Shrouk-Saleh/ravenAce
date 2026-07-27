const IntegrationCompany = require("../models/IntegrationCompany");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const { AppError } = require("../utils/errorUtils");

exports.createExam = async (req, res, next) => {
  try {
    const { externalCompanyId, companyName, questions } = req.body;

    if (!externalCompanyId || !companyName) {
      return next(new AppError("externalCompanyId and companyName are required.", 400));
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return next(new AppError("At least one question is required.", 400));
    }

    // 1. Find or create IntegrationCompany
    let integrationCompany = await IntegrationCompany.findOne({
      provider: req.integration.provider,
      externalCompanyId
    });

    let systemInstructorId;

    if (integrationCompany) {
      systemInstructorId = integrationCompany.systemInstructorId;
    } else {
      // Create Organization
      const org = await Organization.create({
        name: companyName,
        email: `noreply-${externalCompanyId}@${req.integration.provider}.local`, // internal placeholder
      });

      // Create System Instructor
      const systemInstructor = await User.create({
        name: `${companyName} System Instructor`,
        email: `instructor-${externalCompanyId}@${req.integration.provider}.local`,
        password: Math.random().toString(36).slice(-12) + "A1!", // strong random password
        role: "instructor",
        organization: org._id,
        isActive: true
      });

      // Update Org owner
      org.owner = systemInstructor._id;
      await org.save({ validateBeforeSave: false });

      // Create mapping
      integrationCompany = await IntegrationCompany.create({
        provider: req.integration.provider,
        externalCompanyId,
        organizationId: org._id,
        systemInstructorId: systemInstructor._id
      });
      
      systemInstructorId = systemInstructor._id;
    }

    // 2. Whitelist Question fields and create them
    const allowedQuestionFields = [
      "text", "type", "options", "correctAnswer", "explanation",
      "modelAnswer", "gradingCriteria", "codeTemplate", "allowedLanguages",
      "timeLimit", "memoryLimit", "testCases", "maxScore",
      "category", "tags", "difficulty",
    ];

    let calculatedTotalScore = 0;
    const createdQuestions = [];

    for (const q of questions) {
      if (q.maxScore === undefined || q.maxScore === null) {
        return next(new AppError("maxScore is required for every question.", 400));
      }

      const questionData = { instructor: systemInstructorId };
      allowedQuestionFields.forEach((f) => {
        if (q[f] !== undefined) questionData[f] = q[f];
      });
      
      calculatedTotalScore += q.maxScore;
      
      const newQuestion = await Question.create(questionData);
      createdQuestions.push(newQuestion._id);
    }

    // 3. Whitelist Exam fields
    const allowedExamFields = [
      "title", "description", "category", "duration", "passingScore", 
      "maxAttempts", "shuffle"
    ];

    const examData = {
      instructor: systemInstructorId,
      visibility: "private",                  // Hardcoded defense in depth
      source: "hirehub",                      // Hardcoded source
      certificateIssuerName: companyName,     // Hardcoded from verified companyName mapping
      totalScore: calculatedTotalScore,       // Calculated dynamically from questions
      questions: createdQuestions,
      isPublished: true                       // Auto-publish so it can be taken via invite
    };

    allowedExamFields.forEach((f) => {
      if (req.body[f] !== undefined) examData[f] = req.body[f];
    });

    const exam = await Exam.create(examData);

    res.status(201).json({
      status: "success",
      data: { examId: exam._id },
    });
  } catch (err) {
    next(err);
  }
};

