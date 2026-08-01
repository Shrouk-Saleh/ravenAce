const IntegrationCompany = require("../models/IntegrationCompany");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const ExamInvitation = require("../models/ExamInvitation");
const crypto = require("crypto");
const { sendExamInvitation } = require("../utils/emailService");
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
      // 1. Create System Instructor first (organization can be null initially)
      const systemInstructor = await User.create({
        name: `${companyName} System Instructor`,
        email: `instructor-${externalCompanyId}@${req.integration.provider}.local`,
        password: Math.random().toString(36).slice(-12) + "A1!", // strong random password
        role: "instructor",
        isActive: true
      });

      let org;
      try {
        // 2. Create Organization with the instructor as the owner
        org = await Organization.create({
          name: companyName,
          email: `noreply-${externalCompanyId}@${req.integration.provider}.local`, // internal placeholder
          owner: systemInstructor._id
        });
      } catch (err) {
        // Rollback: the instructor is orphaned without an org, remove it
        // so a retry with the same externalCompanyId doesn't hit a duplicate-email error
        await User.findByIdAndDelete(systemInstructor._id);
        throw err;
      }

      // 3. Update the instructor with the new organization ID
      systemInstructor.organization = org._id;
      await systemInstructor.save();

      // 4. Create mapping — also wrap this, since if THIS fails, org+instructor exist but unmapped
      try {
        integrationCompany = await IntegrationCompany.create({
          provider: req.integration.provider,
          externalCompanyId,
          organizationId: org._id,
          systemInstructorId: systemInstructor._id
        });
      } catch (err) {
        console.error(`CRITICAL: Org/Instructor created but IntegrationCompany mapping failed for ${externalCompanyId}`, err);
        throw err;
      }
      
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

exports.inviteCandidate = async (req, res, next) => {
  try {
    let { email, examId, externalCompanyId } = req.body;

    if (!email || !examId || !externalCompanyId) {
      return next(new AppError("email, examId, and externalCompanyId are required.", 400));
    }

    // Normalization: trim and lower case
    email = email.trim().toLowerCase();

    // 1. Authorization: check integration company matches the exam's instructor
    const integrationCompany = await IntegrationCompany.findOne({
      provider: req.integration.provider,
      externalCompanyId
    });

    if (!integrationCompany) {
      return next(new AppError("Company mapping not found. Cannot invite candidates.", 404));
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return next(new AppError("Exam not found.", 404));
    }

    // Defense in depth: Check both instructor AND source
    if (exam.instructor.toString() !== integrationCompany.systemInstructorId.toString() || exam.source !== "hirehub") {
      return next(new AppError("Unauthorized to invite candidates for this exam.", 403));
    }

    // 2. Enumeration-safe check for existing invitation
    let invitation = await ExamInvitation.findOne({ email, examId });

    if (invitation && invitation.status === "consumed") {
      // Already consumed: enumeration-safe silent success
      return res.status(200).json({ 
        status: "success", 
        message: "Invitation processed.",
        data: { invitationId: invitation._id }
      });
    }

    // 3. Create or Update Token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    
    // Exact 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (invitation) {
      // Overwrite the existing token, effectively invalidating the old one
      invitation.tokenHash = tokenHash;
      invitation.expiresAt = expiresAt;
      invitation.status = "pending";
      await invitation.save();
    } else {
      invitation = await ExamInvitation.create({
        email,
        examId,
        tokenHash,
        expiresAt
      });
    }

    // 4. Send Email
    const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/invite/${rawToken}`;
    const companyName = exam.certificateIssuerName || "Our Partner";
    
    try {
      await sendExamInvitation(email, exam.title, companyName, inviteUrl);
    } catch (error) {
      console.error("Error sending exam invitation email:", error);
      // In production, you might not want to return 500 if it's an email failure,
      // but we will let it pass or fail here based on the requirement.
    }

    res.status(200).json({ 
      status: "success", 
      message: "Invitation processed.",
      data: { invitationId: invitation._id }
    });
  } catch (err) {
    next(err);
  }
};

// Public endpoint for the frontend to verify an invitation token
exports.verifyInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return next(new AppError("Token is required.", 400));
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    
    const invitation = await ExamInvitation.findOne({ tokenHash }).populate({
      path: "examId",
      select: "title certificateIssuerName"
    });

    if (!invitation) {
      return next(new AppError("Invalid or expired invitation token.", 404));
    }

    if (invitation.expiresAt < Date.now()) {
      return next(new AppError("This invitation has expired.", 400));
    }

    // We return the relevant data to the frontend so it can display the correct UI (Case A or Case B)
    res.status(200).json({
      status: "success",
      data: {
        email: invitation.email,
        status: invitation.status,
        exam: {
          _id: invitation.examId._id,
          title: invitation.examId.title,
          companyName: invitation.examId.certificateIssuerName
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// --- Helper function for robust consumption logic ---
// Can throw an AppError which is caught by the calling endpoint's catch block.
const consumeInvitationLogic = async (invitation, userEmail, userId) => {
  if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new AppError("This invitation was sent to a different email address.", 403);
  }
  invitation.status = "consumed";
  invitation.consumedAt = Date.now();
  invitation.ravenAceUserId = userId;
  await invitation.save();
};

// Protected endpoint to consume an invitation (Candidate must be logged in)
exports.consumeInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return next(new AppError("Token is required.", 400));
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await ExamInvitation.findOne({ tokenHash });

    if (!invitation) {
      return next(new AppError("Invalid or expired invitation token.", 404));
    }

    if (invitation.status === "consumed") {
      return res.status(200).json({
        status: "success",
        message: "Invitation already consumed.",
        data: { examId: invitation.examId }
      });
    }

    if (invitation.expiresAt < Date.now()) {
      return next(new AppError("This invitation has expired.", 400));
    }

    // Call the shared helper
    await consumeInvitationLogic(invitation, req.user.email, req.user._id);

    res.status(200).json({
      status: "success",
      message: "Invitation consumed successfully.",
      data: { examId: invitation.examId }
    });
  } catch (err) {
    next(err);
  }
};

// ── Case B: Public endpoint to register a new user using an invitation token ──
exports.registerCandidate = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body; // email is INTENTIONALLY omitted from req.body

    if (!token || !name || !password) {
      return next(new AppError("Token, name, and password are required.", 400));
    }

    if (password.length < 8) {
      return next(new AppError("Password must be at least 8 characters.", 400));
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await ExamInvitation.findOne({ tokenHash });

    if (!invitation) {
      return next(new AppError("Invalid or expired invitation token.", 404));
    }

    if (invitation.status !== "pending") {
      return next(new AppError("This invitation is no longer active or has already been consumed.", 400));
    }
    
    if (invitation.expiresAt < Date.now()) {
      return next(new AppError("This invitation has expired.", 400));
    }

    const { encryptSecret } = require("../utils/encryptionUtils");
    
    // 1. Temporarily store name and password (Encrypted reversibly, NOT hashed)
    invitation.tempName = name;
    invitation.tempPasswordEncrypted = encryptSecret(password);

    // 2. Generate and store OTP (same logic as forgotPassword)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    invitation.registrationOTP = hashedOTP;
    invitation.registrationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    invitation.registrationOTPVerified = false;

    // Save with validateBeforeSave: false since we're using partial schema validations
    await invitation.save({ validateBeforeSave: false });

    // 3. Send OTP email
    const { sendOTP } = require("../utils/emailService");
    try {
      await sendOTP(invitation.email, otp);
      console.log(`[EmailService] Registration OTP successfully sent to ${invitation.email}`);
    } catch (emailErr) {
      console.error("[EmailService] Failed to send Registration OTP email:", emailErr);
      invitation.registrationOTP = undefined;
      invitation.registrationOTPExpires = undefined;
      await invitation.save({ validateBeforeSave: false });
      return next(new AppError("Failed to send OTP email. Please check server email config.", 500));
    }

    res.status(200).json({
      status: "success",
      message: "An OTP has been sent to your email to verify your registration.",
      // Notice we do not return the email here either; frontend should know it from the /verify call
    });
  } catch (err) {
    next(err);
  }
};

// ── Case B: Public endpoint to verify OTP and complete registration ──
exports.verifyCandidateOTP = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { otp } = req.body;

    if (!token || !otp) {
      return next(new AppError("Token and OTP are required.", 400));
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    
    // Explicitly select the hidden temporary and OTP fields
    const invitation = await ExamInvitation.findOne({ tokenHash }).select(
      "+registrationOTP +registrationOTPExpires +registrationOTPVerified +tempName +tempPasswordEncrypted"
    );

    if (!invitation || !invitation.registrationOTP) {
      return next(new AppError("Invalid token or no OTP was requested.", 400));
    }

    if (invitation.status !== "pending") {
      return next(new AppError("This invitation is no longer active.", 400));
    }
    
    // Double check invitation expiration
    if (invitation.expiresAt < Date.now()) {
      return next(new AppError("This invitation has expired.", 400));
    }

    // Check OTP expiration
    if (Date.now() > invitation.registrationOTPExpires) {
      invitation.registrationOTP = undefined;
      invitation.registrationOTPExpires = undefined;
      await invitation.save({ validateBeforeSave: false });
      return next(new AppError("OTP has expired. Please request a new one.", 400));
    }

    // Hash incoming OTP and compare
    const hashedIncoming = crypto.createHash("sha256").update(String(otp)).digest("hex");
    if (hashedIncoming !== invitation.registrationOTP) {
      return next(new AppError("Invalid OTP.", 400));
    }

    // 1. Decrypt the temporary password
    const { decryptSecret } = require("../utils/encryptionUtils");
    let decryptedPassword;
    try {
      decryptedPassword = decryptSecret(invitation.tempPasswordEncrypted);
    } catch (err) {
      return next(new AppError("Failed to decrypt temporary credentials. Please request a new OTP.", 500));
    }

    // 2. Create the new User properly using Mongoose (triggers pre-save hashing and validations)
    const newUser = await User.create({
      name: invitation.tempName,
      email: invitation.email,
      password: decryptedPassword,
      role: "student",
      isActive: true,
    });

    // 3. Clear temp fields and verify OTP
    invitation.registrationOTPVerified = true;
    invitation.registrationOTP = undefined;
    invitation.registrationOTPExpires = undefined;
    invitation.tempName = undefined;
    invitation.tempPasswordEncrypted = undefined;
    
    // 4. Consume the invitation via shared helper logic
    await consumeInvitationLogic(invitation, newUser.email, newUser._id);
    
    // 5. Generate JWT for auto login
    const generateToken = require("../utils/generateToken");
    const jwtToken = generateToken(newUser._id);

    res.status(200).json({
      status: "success",
      message: "Registration successful. Invitation consumed.",
      token: jwtToken,
      data: {
        examId: invitation.examId,
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError("User with this email already exists.", 400));
    }
    next(err);
  }
};

exports.getInvitationResult = async (req, res, next) => {
  try {
    const { invitationId } = req.params;

    if (!invitationId) {
      return next(new AppError("invitationId is required.", 400));
    }

    // 1. Fetch invitation and populate exam
    const invitation = await ExamInvitation.findById(invitationId).populate("examId");

    if (!invitation || !invitation.examId) {
      return next(new AppError("Invitation or associated exam not found.", 404));
    }

    // 2. Security Check: ensure this API key (provider) actually owns the instructor of this exam
    const integrationCompany = await IntegrationCompany.findOne({
      provider: req.integration.provider,
      systemInstructorId: invitation.examId.instructor
    });

    if (!integrationCompany) {
      return next(new AppError("Unauthorized to view results for this invitation.", 403));
    }

    // 4. Status mapping logic
    if (invitation.status !== "consumed") {
      // Pending or expired -> has not opened link / logged in
      return res.status(200).json({
        status: "success",
        data: { status: "not_started" }
      });
    }

    // Invitation is consumed: User logged in / registered. Look for an Attempt.
    const Attempt = require("../models/Attempt");
    
    // Sort by createdAt descending to get the latest attempt if there are multiple
    const attempt = await Attempt.findOne({
      student: invitation.ravenAceUserId,
      exam: invitation.examId._id
    }).sort({ createdAt: -1 });

    if (!attempt) {
      // Consumed but no attempt started yet
      return res.status(200).json({
        status: "success",
        data: { status: "registered" }
      });
    }

    // Attempt exists. Map the complex enum to a simple one for HireHub.
    let mappedStatus;
    switch (attempt.status) {
      case "in-progress":
        mappedStatus = "in_progress";
        break;
      case "grading":
        mappedStatus = "grading";
        break;
      case "submitted":
      case "auto-submitted":
      case "timed-out":
        mappedStatus = "completed";
        break;
      case "abandoned":
      case "error":
      default:
        mappedStatus = "error";
        break;
    }

    const responseData = { status: mappedStatus };

    // If completed, append the scores
    if (mappedStatus === "completed") {
      responseData.score = attempt.score;
      responseData.passed = attempt.passed;
    }

    res.status(200).json({
      status: "success",
      data: responseData
    });
  } catch (err) {
    next(err);
  }
};


