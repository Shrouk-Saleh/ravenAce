# Backend API Pipeline & Call Flow Documentation
# Overview of Request Pipeline and Endpoint Call Flows by Module

---

## 1. General Pipeline Explanation (Request Lifecycle)

Any HTTP Request initiated by the Client (whether a Browser, Mobile App, or Postman) passing through the **EduCert Pro** server follows a structured, consistent 6-stage pipeline before returning the final Response to the user.

```
┌─────────────────────────────────────────────────────────────┐
│                 CLIENT (Browser / Postman)                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP Request (e.g., POST /api/auth/login)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             1. GLOBAL MIDDLEWARE (server.js)                │
│  • helmet()          <-- Secures HTTP headers               │
│  • cors()            <-- Enables Cross-Origin requests      │
│  • express.json() / express.raw() <-- Parses request body   │
│  • mongoSanitize()   <-- Prevents NoSQL Injection           │
│  • apiLimiter        <-- General rate limit (2000 requests) │
└──────────────────────────────┬──────────────────────────────┘
                               │ Valid requests proceed
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 2. ROUTE & MODULE MATCHING                  │
│  • Express Router    <-- Directs request to specific route  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            3. ROUTE-SPECIFIC MIDDLEWARE (Guards)            │
│  • protect           <-- Validates JWT & active account     │
│  • authorize         <-- Validates user role permissions    │
│  • orgMiddleware     <-- Checks organization subscription   │
│  • authLimiter       <-- Prevents brute-force attacks       │
│  • upload (Multer)   <-- Handles multi-part file uploads    │
└──────────────────────────────┬──────────────────────────────┘
                               │ On success
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             4. CONTROLLER (Business Logic Layer)            │
│  • Extracts data from req.body, req.params, req.query       │
│  • Validates inputs and executes core business logic        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              5. DATABASE & EXTERNAL SERVICES                │
│  • Mongoose Models   <-- MongoDB read/write operations      │
│  • AI Services       <-- Communicates with Gemini AI        │
│  • Stripe / Email    <-- Payment processing or OTP delivery │
│  • Socket.io         <-- Dispatches real-time events        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  6. RESPONSE / ERROR HANDLING               │
│  • res.status(200).json(...) <-- Returns payload to client  │
│  • globalErrorHandler        <-- Captures & formats errors  │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 2. Request Call Flow per Endpoint by Module

Below is the detailed step-by-step Call Flow for each endpoint, tracing the path from the Route, through Middleware, Controller, Models/Services, to the final Response.

---

### 1. Auth Module
*Base Route: `api/auth/*`*

* `POST /api/auth/register`
  1. **Middleware**: `authLimiter` (limits request attempts)
  2. **Controller**: `authController.register`
  3. **Models/Services**: Verifies email does not already exist ➔ Creates `User` document ➔ Triggers Mongoose pre-save hook to hash password using `bcryptjs` ➔ Calls `generateToken`
  4. **Response**: Returns user details + `token`

* `POST /api/auth/login`
  1. **Middleware**: `authLimiter`
  2. **Controller**: `authController.login`
  3. **Models/Services**: Finds `User` by email ➔ Verifies password with `bcryptjs.compare` (protecting against timing attacks) ➔ Calls `generateToken`
  4. **Response**: Returns user details + `token`

* `POST /api/auth/activate-account`
  1. **Middleware**: `authLimiter`
  2. **Controller**: `authController.activateAccount`
  3. **Models/Services**: Finds `User` by email ➔ Compares activation code ➔ Updates `isActive: true` in the database
  4. **Response**: Account activation success message + user details

* `POST /api/auth/forgot-password`
  1. **Middleware**: `authLimiter`
  2. **Controller**: `authController.forgotPassword`
  3. **Models/Services**: Finds `User` ➔ Generates a 6-digit OTP ➔ Hashes and stores OTP in `User` with a 10-minute expiration ➔ Calls `emailService.sendEmail` to send the code
  4. **Response**: Confirmation message stating OTP was sent to email

* `POST /api/auth/verify-reset-otp`
  1. **Middleware**: None (relies on OTP validity)
  2. **Controller**: `authController.verifyResetOTP`
  3. **Models/Services**: Verifies user existence and hashed OTP validity ➔ Generates a temporary `resetToken` (configured with purpose: 'reset_password')
  4. **Response**: Returns `resetToken`

* `POST /api/auth/reset-password`
  1. **Middleware**: None
  2. **Controller**: `authController.resetPassword`
  3. **Models/Services**: Validates `resetToken` via JWT ➔ Extracts `userId` ➔ Updates password in `User` (automatically hashed via Mongoose hook) ➔ Clears old OTP
  4. **Response**: Password reset success message

---

### 2. Users Module
*Base Route: `api/users/*`*

* `GET /api/users/me`
  1. **Middleware**: `protect` (validates Token and injects `req.user`)
  2. **Controller**: `userController.getProfile`
  3. **Models/Services**: Queries `User.findById(req.user.id)`
  4. **Response**: Returns current user profile details

* `PUT /api/users/me`
  1. **Middleware**: `protect`
  2. **Controller**: `userController.updateProfile`
  3. **Models/Services**: Updates name or email via `User.findByIdAndUpdate`
  4. **Response**: Returns updated user details

* `POST /api/users/me/photo`
  1. **Middleware**: `protect` ➔ `upload.single("photo")` (Multer saves file locally in `uploads/` and attaches `req.file`)
  2. **Controller**: `userController.uploadProfilePhoto`
  3. **Models/Services**: Saves new image path to `User.profilePhoto`
  4. **Response**: Returns new image URL `photoUrl`

---

### 3. Exams Module
*Base Route: `api/exams/*`*

* `GET /api/exams`
  1. **Middleware**: `protect`
  2. **Controller**: `examController.getAllExams`
  3. **Models/Services**: Inspects user role ➔ (If student: fetches only published exams `isPublished: true`; if instructor: fetches exams created by them `instructor: req.user.id`) via `Exam.find`
  4. **Response**: Filtered list of exams

* `GET /api/exams/:id`
  1. **Middleware**: `protect`
  2. **Controller**: `examController.getExamById`
  3. **Models/Services**: Fetches exam details `Exam.findById` and populates `questions`
  4. **Response**: Exam details along with associated questions

* `POST /api/exams`
  1. **Middleware**: `protect` ➔ `authorize("instructor")` (instructors only)
  2. **Controller**: `examController.createExam`
  3. **Models/Services**: Creates a new exam via `Exam.create` and links it to the instructor `req.user.id`
  4. **Response**: The newly created exam document

* `PUT /api/exams/:id`
  1. **Middleware**: `protect` ➔ `authorize("instructor")`
  2. **Controller**: `examController.updateExam`
  3. **Models/Services**: Verifies instructor ownership of exam ➔ Updates details via `Exam.findByIdAndUpdate`
  4. **Response**: The updated exam document

* `PATCH /api/exams/:id/publish`
  1. **Middleware**: `protect` ➔ `authorize("instructor")`
  2. **Controller**: `examController.togglePublish`
  3. **Models/Services**: Toggles `isPublished` state in database ➔ If published, calls `socket.emitToAll("new-exam", ...)` to instantly broadcast to all connected students
  4. **Response**: The new publish state

* `DELETE /api/exams/:id`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `examController.deleteExam`
  3. **Models/Services**: Verifies authorization ➔ Deletes exam via `Exam.findByIdAndDelete`
  4. **Response**: Deletion confirmation message

---

### 4. Questions Module
*Base Route: `api/questions/*`*

* `GET /api/questions`
  1. **Middleware**: `protect` ➔ `authorize("instructor")`
  2. **Controller**: `questionController.getAllQuestions`
  3. **Models/Services**: Filters questions in Mongoose based on instructor `req.user.id`, search query `req.query.search`, and category `req.query.category`
  4. **Response**: List of questions

* `GET /api/questions/:id/stats`
  1. **Middleware**: `protect` ➔ `authorize("instructor")`
  2. **Controller**: `questionController.getQuestionStats`
  3. **Models/Services**: Executes MongoDB Aggregation Pipeline on attempts collections to calculate correct vs incorrect answer percentages for the question
  4. **Response**: Question statistics and success metrics

* `POST /api/questions`
  1. **Middleware**: `protect` ➔ `authorize("instructor")`
  2. **Controller**: `questionController.createQuestion`
  3. **Models/Services**: Validates question type (MCQ or TrueFalse) and verifies correct answer exists within options ➔ `Question.create`
  4. **Response**: The newly created question document

* `PUT /api/questions/:id`
  1. **Middleware**: `protect` ➔ `authorize("instructor")`
  2. **Controller**: `questionController.updateQuestion`
  3. **Models/Services**: Updates question document via `Question.findByIdAndUpdate`
  4. **Response**: The updated question document

* `DELETE /api/questions/:id`
  1. **Middleware**: `protect` ➔ `authorize("instructor")`
  2. **Controller**: `questionController.deleteQuestion`
  3. **Models/Services**: Deletes question from `Question` collection and removes its `questionId` from any associated exams
  4. **Response**: Deletion success message

* `POST /api/questions/add-to-exam`
  1. **Middleware**: `protect` ➔ `authorize("instructor")`
  2. **Controller**: `questionController.addToExam`
  3. **Models/Services**: Finds the target exam ➔ Pushes `questionId` into `exam.questions` array ➔ `exam.save()`
  4. **Response**: Success message + exam details

* `POST /api/questions/remove-from-exam`
  1. **Middleware**: `protect` ➔ `authorize("instructor")`
  2. **Controller**: `questionController.removeFromExam`
  3. **Models/Services**: Removes `questionId` from `exam.questions` array ➔ `exam.save()`
  4. **Response**: Success message + exam details

---

### 5. Attempts Module
*Base Route: `api/attempts/*`*

* `GET /api/attempts/history`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `attemptController.getAttemptHistory`
  3. **Models/Services**: Fetches all attempts belonging to the student `Attempt.find({ student: req.user.id })`
  4. **Response**: List of previous attempts

* `POST /api/attempts/start`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `attemptController.startExam`
  3. **Models/Services**: Checks for an existing `in-progress` attempt (returns it to resume if found) ➔ If none exists: verifies `maxAttempts` limit ➔ Creates a new `Attempt` ➔ Calls `socket.emitToUser`
  4. **Response**: Attempt details + exam questions (with correct answers stripped out)

* `PATCH /api/attempts/:id/save-answer`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `attemptController.saveAnswer`
  3. **Models/Services**: Verifies remaining exam time ➔ Updates or pushes student answer into `attempt.savedAnswers` array ➔ `attempt.save()`
  4. **Response**: `{ success: true }` (utilized for Auto-save functionality)

* `POST /api/attempts/:id/submit`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `attemptController.submitExam`
  3. **Models/Services**: Sets attempt status to `submitted` ➔ Invokes auto-grading function `gradeAttempt()` ➔ Compares student answers against correct answers in `Question` ➔ Calculates `score` ➔ If student passes: generates a certificate via `Certificate.create` with a UUID v4 ➔ Sends real-time notification to student `socket.emitToUser("exam-result", ...)`
  4. **Response**: Final score details + certificate data (if applicable)

* `POST /api/attempts/:id/cheat-event`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `attemptController.logCheatEvent`
  3. **Models/Services**: Validates violation type against `constants.VIOLATION_TYPES` ➔ Creates `CheatLog` document ➔ Checks total attempt violations (if reaching 3, automatically terminates exam `attempt.status = 'auto-submitted'` and grades it)
  4. **Response**: Violation details + exam termination status

* `POST /api/attempts/:id/abandon`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `attemptController.abandonAttempt`
  3. **Models/Services**: Updates attempt status to `abandoned` in `Attempt` collection
  4. **Response**: Attempt cancellation confirmation message

* `GET /api/attempts/:id`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `attemptController.getAttemptResult`
  3. **Models/Services**: Fetches final attempt result along with its questions
  4. **Response**: Result and questions breakdown

* `GET /api/attempts/:id/violations`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `attemptController.getViolations`
  3. **Models/Services**: Fetches all cheat logs `CheatLog.find({ attempt: req.params.id })`
  4. **Response**: List of cheat violations with timestamps and event specifics

---

### 6. Results Module
*Base Route: `api/results/*`*

* `GET /api/results/my-history`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `resultController.getMyHistory`
  3. **Models/Services**: Fetches summary of current student results
  4. **Response**: List of student results and statistics

* `GET /api/results/:attemptId`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `resultController.getMyResult`
  3. **Models/Services**: Fetches attempt `Attempt.findById` ➔ Merges questions data and `explanation`
  4. **Response**: Comprehensive question review details

* `GET /api/results/exam/:examId/attempts`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `resultController.getExamAttempts`
  3. **Models/Services**: Fetches all completed attempts for a specific exam `Attempt.find` populating student details `populate('student')`
  4. **Response**: List of all student results for the exam

* `GET /api/results/exam/:examId/export-csv`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `resultController.exportCSV`
  3. **Models/Services**: Extracts data ➔ Constructs CSV string data in a Memory Buffer
  4. **Response**: Sets download header `res.setHeader('Content-Type', 'text/csv')` and returns the file

* `GET /api/results/exam/:examId/export-pdf`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `resultController.exportPDF`
  3. **Models/Services**: Initializes `PDFKit` ➔ Constructs report (logo, statistics, results table) ➔ Pipes PDF Stream
  4. **Response**: Sets header `res.setHeader('Content-Type', 'application/pdf')` and pipes the Stream

* `GET /api/results/attempt/:attemptId/detail`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `resultController.getAttemptDetail`
  3. **Models/Services**: Fetches full details of a specific attempt for the instructor
  4. **Response**: Comprehensive attempt object

* `PUT /api/results/attempt/:attemptId/grade/:questionId`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `resultController.updateManualGrade`
  3. **Models/Services**: Manually updates a specific question's grade inside `attempt.perQuestionResult` ➔ Recalculates total `score` ➔ `attempt.save()`
  4. **Response**: Attempt details following manual grade adjustment

---

### 7. Leaderboard Module
*Base Route: `api/leaderboard/*`*

* `GET /api/leaderboard/admin/overview`
  1. **Middleware**: `protect` ➔ `authorize("admin")`
  2. **Controller**: `leaderboardController.getAdminOverview`
  3. **Models/Services**: Executes parallel queries via `Promise.all` to fetch total users, total exams, and total attempts
  4. **Response**: General system overview statistics

* `GET /api/leaderboard/:examId`
  1. **Middleware**: `protect`
  2. **Controller**: `leaderboardController.getLeaderboard`
  3. **Models/Services**: Fetches top passing attempts for an exam `Attempt.find` sorted descending by score `score: -1` and ascending by time taken `timeTaken: 1`
  4. **Response**: Honor roll (Top attempts)

* `GET /api/leaderboard/:examId/stats`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `leaderboardController.getExamStats`
  3. **Models/Services**: Executes advanced aggregation `Attempt.aggregate(...)` to calculate average scores, pass rate, and fastest completion time
  4. **Response**: Analytical instructor statistics

---

### 8. Certificates Module
*Base Route: `api/certificates/*`*

* `GET /api/certificates/verify/:certId`
  1. **Middleware**: Public route (without `protect`)
  2. **Controller**: `certificateController.verifyCertificate`
  3. **Models/Services**: Finds certificate by unique ID `Certificate.findOne({ certId: req.params.certId })` populating student and exam details
  4. **Response**: Verification status and certificate details

* `GET /api/certificates/mine`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `certificateController.getMyCertificates`
  3. **Models/Services**: Queries `Certificate.find({ student: req.user.id })`
  4. **Response**: List of student certificates

* `GET /api/certificates/:id`
  1. **Middleware**: `protect`
  2. **Controller**: `certificateController.getCertificateById`
  3. **Models/Services**: Fetches specific certificate by standard ID
  4. **Response**: Certificate data

---

### 9. Notifications Module
*Base Route: `api/notifications/*`*

* `PATCH /api/notifications/read-all`
  1. **Middleware**: `protect`
  2. **Controller**: `notificationController.markAllRead`
  3. **Models/Services**: Updates all user notifications `Notification.updateMany({ user: req.user.id }, { read: true })`
  4. **Response**: Read confirmation message

* `GET /api/notifications`
  1. **Middleware**: `protect`
  2. **Controller**: `notificationController.getNotifications`
  3. **Models/Services**: Fetches notifications `Notification.find({ user: req.user.id }).sort({ createdAt: -1 })`
  4. **Response**: List of notifications

* `PATCH /api/notifications/:id/read`
  1. **Middleware**: `protect`
  2. **Controller**: `notificationController.markOneRead`
  3. **Models/Services**: Updates a single notification `Notification.findOneAndUpdate(..., { read: true })`
  4. **Response**: The updated notification

* `DELETE /api/notifications/:id`
  1. **Middleware**: `protect`
  2. **Controller**: `notificationController.deleteNotification`
  3. **Models/Services**: Deletes notification `Notification.findOneAndDelete`
  4. **Response**: Deletion confirmation message

---

### 10. Admin Module
*Base Route: `api/admin/*`*

* `GET /api/admin/users`
  1. **Middleware**: `protect` ➔ `authorize("admin")`
  2. **Controller**: `adminController.getAllUsers`
  3. **Models/Services**: Fetches all users `User.find()`
  4. **Response**: List of users

* `PATCH /api/admin/users/:id/role`
  1. **Middleware**: `protect` ➔ `authorize("admin")`
  2. **Controller**: `adminController.updateUserRole`
  3. **Models/Services**: Updates user role `User.findByIdAndUpdate(..., { role: req.body.role })`
  4. **Response**: The updated user

* `PATCH /api/admin/users/:id/toggle-active`
  1. **Middleware**: `protect` ➔ `authorize("admin")`
  2. **Controller**: `adminController.toggleUserActive`
  3. **Models/Services**: Toggles account active state `user.isActive = !user.isActive` ➔ `user.save()`
  4. **Response**: Current user active state

* `DELETE /api/admin/users/:id`
  1. **Middleware**: `protect` ➔ `authorize("admin")`
  2. **Controller**: `adminController.deleteUser`
  3. **Models/Services**: Deletes user from `User` collection and associated records
  4. **Response**: Deletion confirmation message

* `GET /api/admin/exams`
  1. **Middleware**: `protect` ➔ `authorize("admin")`
  2. **Controller**: `adminController.getAllExamsAdmin`
  3. **Models/Services**: Fetches all exams across the platform
  4. **Response**: List of exams

* `DELETE /api/admin/exams/:id`
  1. **Middleware**: `protect` ➔ `authorize("admin")`
  2. **Controller**: `adminController.deleteExamAdmin`
  3. **Models/Services**: Deletes any exam `Exam.findByIdAndDelete`
  4. **Response**: Deletion confirmation message

---

### 11. AI Module
*Base Route: `api/ai/*`*

* `GET /api/ai/health`
  1. **Middleware**: `protect`
  2. **Controller**: `aiController.getAiHealth`
  3. **Models/Services**: Sends a lightweight ping request via `geminiService.generateText("ping")` to verify Google Gemini API connectivity
  4. **Response**: `{ status: "OK", service: "Gemini AI" }`

* `POST /api/ai/grade-written/:attemptId/:questionId`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `aiController.gradeWritten`
  3. **Models/Services**: Fetches student answer ➔ Calls `writtenGraderService.gradeAnswer` (passing answer to Gemini) ➔ Saves score in `attempt.perQuestionResult` ➔ `attempt.save()`
  4. **Response**: Score and AI evaluation feedback

* `POST /api/ai/grade-all-written/:attemptId`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `aiController.gradeAllWritten`
  3. **Models/Services**: Iterates over all written questions in the attempt and grades them in a batch via `writtenGraderService`
  4. **Response**: Attempt details with updated scores

* `POST /api/ai/run-code`
  1. **Middleware**: `protect`
  2. **Controller**: `aiController.runCodeSandbox`
  3. **Models/Services**: Calls `codeGraderService.runCode` to execute code within a secure sandbox environment
  4. **Response**: Execution outputs (Console output or Syntax Errors)

* `POST /api/ai/submit-code/:attemptId/:questionId`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `aiController.submitCode`
  3. **Models/Services**: Calls `codeGraderService.gradeCode` to execute Test Cases ➔ Saves score in `Attempt`
  4. **Response**: Score and Test Cases breakdown

* `POST /api/ai/tutor/chat`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `aiController.tutorChat`
  3. **Models/Services**: Fetches chat history from `ChatMessage` ➔ Calls `tutorService.generateResponse` (via Gemini) ➔ Saves new message in `ChatMessage.create`
  4. **Response**: AI Tutor response

* `GET /api/ai/tutor/history/:examId`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `aiController.getTutorHistory`
  3. **Models/Services**: Queries `ChatMessage.find({ student: req.user.id, exam: req.params.examId })`
  4. **Response**: Chat history logs

* `DELETE /api/ai/tutor/history/:examId`
  1. **Middleware**: `protect` ➔ `authorize("student")`
  2. **Controller**: `aiController.clearTutorHistory`
  3. **Models/Services**: Deletes messages `ChatMessage.deleteMany`
  4. **Response**: Deletion confirmation message

* `POST /api/ai/generate-questions`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `aiController.generateAiQuestions`
  3. **Models/Services**: Calls `questionGenService.generateQuestions` (prompting Gemini to generate questions in JSON format)
  4. **Response**: List of suggested questions

* `POST /api/ai/save-questions`
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `aiController.saveAiQuestions`
  3. **Models/Services**: Inserts questions into database `Question.insertMany`
  4. **Response**: The saved questions

* `POST /api/ai/analyze-cheat/:attemptId` (and `GET`)
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `aiController.runCheatAnalysis` (or `getCheatAnalysis`)
  3. **Models/Services**: Aggregates `CheatLog` records for the attempt ➔ Sends them to `cheatAnalysisService.analyze` (Gemini analyzes behavior) ➔ Saves report in `AiAnalysis.create`
  4. **Response**: Cheat analysis report

* `POST /api/ai/analyze-performance/:attemptId` (and `GET`)
  1. **Middleware**: `protect`
  2. **Controller**: `aiController.runPerformanceAnalysis` (or `getPerformanceAnalysis`)
  3. **Models/Services**: Calls `performanceService.analyze` (Gemini analyzes student weaknesses) ➔ Saves report in `AiAnalysis`
  4. **Response**: Performance report and recommendations

* `POST /api/ai/plagiarism/:examId` (and `GET`)
  1. **Middleware**: `protect` ➔ `authorize("instructor", "admin")`
  2. **Controller**: `aiController.runPlagiarismDetection` (or `getPlagiarismReport`)
  3. **Models/Services**: Fetches all attempts ➔ Calls `plagiarismService.detect` (compares answers via `similarityUtils`) ➔ Saves report in `PlagiarismReport.create`
  4. **Response**: Plagiarism and similarity report

---

### 12. Organization Module
*Base Route: `api/organization/*`*
*(All routes in this module apply the following base Middleware: `protect` ➔ `authorize("organization")` ➔ `loadOrganization`)*

* `GET /api/organization/profile` (and `PUT`)
  1. **Middleware**: `protect` ➔ `authorize("organization")` ➔ `loadOrganization` (fetches `Organization` and attaches it to `req.org`)
  2. **Controller**: `organizationController.getProfile` (or `updateProfile`)
  3. **Models/Services**: Reads `req.org` (or updates it via `Organization.findByIdAndUpdate`)
  4. **Response**: Organization details

* `POST /api/organization/logo`
  1. **Middleware**: `protect` ➔ `authorize` ➔ `loadOrganization` ➔ `upload.single("logo")`
  2. **Controller**: `organizationController.uploadLogo`
  3. **Models/Services**: Saves image path in `org.logoUrl`
  4. **Response**: New logo URL

* `GET /api/organization/dashboard`
  1. **Middleware**: `protect` ➔ `authorize` ➔ `loadOrganization`
  2. **Controller**: `organizationController.getDashboard`
  3. **Models/Services**: Aggregates statistics for instructors and students belonging to the organization
  4. **Response**: Organization statistics dashboard

* `GET /api/organization/instructors` (and `POST`, `PUT`, `DELETE`, `PATCH`, `resend-invite`)
  1. **Middleware**: `protect` ➔ `authorize` ➔ `loadOrganization` ➔ `requireActiveSubscription` (verifies active paid subscription)
  2. **Controller**: Instructor management functions in `organizationController` (`getInstructors`, `createInstructor`, ...)
  3. **Models/Services**: Manages instructor accounts linked to `org._id` within the `User` collection
  4. **Response**: Instructor details or confirmation messages

* `GET /api/organization/students` (and `POST`, `PUT`, `DELETE`, `PATCH`, `resend-invite`)
  1. **Middleware**: `protect` ➔ `authorize` ➔ `loadOrganization` ➔ `requireActiveSubscription`
  2. **Controller**: Student management functions in `organizationController` (`getStudents`, `createStudent`, ...)
  3. **Models/Services**: Manages student accounts linked to `org._id` within the `User` collection
  4. **Response**: Student details or confirmation messages

---

### 13. Stripe Module
*Base Route: `api/stripe/*`*

* `POST /api/stripe/webhook`
  1. **Middleware**: `express.raw({ type: "application/json" })` (must be Raw Buffer for Stripe signature verification)
  2. **Controller**: `stripeController.handleWebhook`
  3. **Models/Services**: Calls `stripe.webhooks.constructEvent` for security verification ➔ Inspects payment event (e.g. `invoice.payment_succeeded` or `customer.subscription.deleted`) ➔ Updates `subscriptionStatus` in `Organization`
  4. **Response**: `{ received: true }`

* `POST /api/stripe/create-checkout` (and `billing-portal`, `get/subscription`, `cancel`)
  1. **Middleware**: `protect` ➔ `authorize("organization")` ➔ `loadOrganization`
  2. **Controller**: Functions in `stripeController` (`createCheckout`, `getBillingPortal`, `getSubscription`, `cancelSubscription`)
  3. **Models/Services**: Interfaces with Stripe API library via `stripeService` to create checkout sessions or billing portals
  4. **Response**: Payment portal links `url` or subscription details
