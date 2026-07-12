# Backend Code Explanation & Functions Documentation
# Overview of Code Architecture, File Structure, and Function Specifications (Inputs & Outputs)

---

## 1. System Overview

The **EduCert Pro (Backend)** system is built on **Node.js**, utilizing the **Express.js** framework and a **MongoDB** database (managed via the **Mongoose ODM**). 
The codebase follows a modern layered architecture inspired by **MVC (Model-View-Controller)**, specifically tailored for robust REST APIs with clear separation of responsibilities:

1. **Entry Point (`server.js`)**: The entry point of the server. It integrates the HTTP Server and WebSocket Server (`Socket.io`) on the same port (5000). It initializes security headers (`helmet`, `cors`, `mongoSanitize`), sets up rate limiters, and mounts all base API routes.
2. **Routes (`routes/`)**: Receives incoming HTTP requests, matches the endpoints, executes necessary security middleware (such as verifying JWT tokens and user roles), and routes the request to the appropriate Controller.
3. **Controllers (`controllers/`)**: Encapsulates the core business logic for each endpoint. Extracts data from incoming requests (`req.body`, `req.params`, `req.query`), invokes required Models or Services, and returns a JSON response or passes errors to the Global Error Handler.
4. **Services (`services/`)**: Dedicated layer for complex operations and external integrations decoupled from Controllers (e.g., interacting with Google Gemini AI, analyzing cheat behaviors, executing sandboxed code grading, and communicating with Stripe).
5. **Models (`models/`)**: Defines database table structures (Mongoose Schemas), entity relationships, data validation rules, and lifecycle hooks (e.g., pre-save hooks for password hashing).
6. **Middleware (`middleware/`)**: Intercepts requests before reaching controllers to enforce access control (verifying authentication via `protect`, checking role permissions via `authorize`, verifying organization subscription via `orgMiddleware`, and processing file uploads via `uploadMiddleware`).
7. **Utils (`utils/`)**: General utility helper modules (sending emails, generating JWT tokens, managing WebSocket broadcasting, and custom error handling classes).

---

## 2. File Directory Structure

```
backend/
├── config/
│   └── db.js                   <-- MongoDB database connection initialization
├── controllers/
│   ├── adminController.js      <-- Admin management for users and exams
│   ├── aiController.js         <-- AI integration handlers (grading, question generation, cheat analysis)
│   ├── attemptController.js    <-- Exam attempt lifecycle, answer auto-saving, and cheat event logging
│   ├── authController.js       <-- User registration, login, account activation, and password reset
│   ├── certificateController.js<-- Certificate issuance, viewing, and public verification
│   ├── examController.js       <-- Core CRUD operations and publishing workflow for exams
│   ├── leaderboardController.js<-- Honor roll leaderboards and exam performance analytics
│   ├── notificationController.js<- In-app user notification management
│   ├── organizationController.js<- Organization management, instructors, and student members
│   ├── questionController.js   <-- Question bank CRUD and exam association management
│   ├── resultController.js     <-- Exam results viewing, attempt breakdowns, and PDF/CSV export
│   ├── stripeController.js     <-- Payment sessions, subscription management, and Stripe Webhook
│   └── userController.js       <-- User profile management and avatar file upload
├── middleware/
│   ├── authMiddleware.js       <-- JWT verification and role authorization (protect & authorize)
│   ├── orgMiddleware.js        <-- Organization resolution and active subscription verification
│   ├── rateLimiter.js          <-- Endpoint protection against brute-force and spam
│   └── uploadMiddleware.js     <-- Multipart file and image upload handling via Multer
├── models/
│   ├── AiAnalysis.js           <-- Model for AI evaluation reports (performance & cheat analysis)
│   ├── Attempt.js              <-- Model for student exam attempts (timer state, answers, final score)
│   ├── Certificate.js          <-- Model for issued certificates (UUID, score, issuance date)
│   ├── ChatMessage.js          <-- Model for AI Tutor chat message logs
│   ├── CheatLog.js             <-- Model for logged cheat events (tab switching, leaving fullscreen...)
│   ├── Exam.js                 <-- Model for exams (title, duration, passing thresholds, publish state)
│   ├── Notification.js         <-- Model for user notifications (type, message content, read status)
│   ├── Organization.js         <-- Model for organizations (profile, logo, Stripe subscription details)
│   ├── PlagiarismReport.js     <-- Model for student answer similarity reports (Plagiarism)
│   ├── Question.js             <-- Model for questions (prompt text, type, options, correct answer)
│   └── User.js                 <-- Model for users (name, email, hashed password, role, OTP records)
├── routes/                     <-- API route definitions (wiring middleware guards to controllers)
├── services/
│   ├── cheatAnalysisService.js <-- AI-powered cheat behavior pattern analysis
│   ├── codeGraderService.js    <-- Sandboxed code execution and test case verification (Code Sandbox)
│   ├── geminiService.js        <-- Dedicated API wrapper for Google Gemini AI integration
│   ├── performanceService.js   <-- Student performance strength and weakness analytics
│   ├── plagiarismService.js    <-- Answer similarity comparison and plagiarism detection
│   ├── questionGenService.js   <-- AI-powered test question generation
│   ├── stripeService.js        <-- Official Stripe API wrapper for checkout and billing portal
│   ├── tutorService.js         <-- AI Tutor interactive learning and chat logic
│   └── writtenGraderService.js <-- AI-powered essay and written answer grading
├── utils/
│   ├── constants.js            <-- Application constants (e.g., supported cheat violation types)
│   ├── emailService.js         <-- Email delivery wrapper for OTP codes via Nodemailer
│   ├── errorUtils.js           <-- Custom AppError class and Express Global Error Handler
│   ├── generateToken.js        <-- Encrypted JWT token generator helper
│   ├── similarityUtils.js      <-- String similarity algorithm helpers (Cosine Similarity / Levenshtein)
│   └── socket.js               <-- Socket.io initialization and real-time event broadcasting
├── .env                        <-- Environment variables (DB URI, JWT secret, Gemini & Stripe API keys)
└── server.js                   <-- Server entry point and bootstrapping execution
```

---

## 3. Function Specifications (Inputs & Outputs)

Below is a precise summary of all core functions within the system, categorized by architectural layer:

### 1. Controllers

| Controller (Module) | Function Name | Description | Input Parameters | Output / Response |
| :--- | :--- | :--- | :--- | :--- |
| **authController** | `register` | Registers a new user account and sets initial role | `req.body` (name, email, password, role) | `res.json` (User data + JWT Token) |
| | `login` | Authenticates user credentials and generates JWT | `req.body` (email, password) | `res.json` (User data + JWT Token) |
| | `activateAccount` | Activates an inactive user account via verification code | `req.body` (email, activationCode/OTP) | `res.json` (Success message + User data) |
| | `forgotPassword` | Generates a 6-digit OTP for password reset and sends email | `req.body` (email) | `res.json` (Success message telling OTP sent) |
| | `verifyResetOTP` | Validates OTP and generates a temporary reset token | `req.body` (email, otp) | `res.json` (resetToken valid for 10 minutes) |
| | `resetPassword` | Updates user password using a valid resetToken | `req.body` (resetToken, newPassword) | `res.json` (Success message) |
| **userController** | `getProfile` | Fetches profile details of the currently authenticated user | `req.user.id` (from protect middleware) | `res.json` (User document details) |
| | `updateProfile` | Updates user name or email | `req.user.id`, `req.body` (name, email) | `res.json` (Updated user document) |
| | `uploadProfilePhoto` | Saves profile image file path after upload via Multer | `req.user.id`, `req.file` (uploaded file record) | `res.json` (Updated photo URL) |
| **examController** | `getAllExams` | Fetches exams (Filtered by role: instructors see their own exams, students see published exams) | `req.user` (id, role), `req.query` (pagination/filters) | `res.json` (List of Exams) |
| | `getExamById` | Fetches specific exam details by ID | `req.params.id` | `res.json` (Exam document + Questions) |
| | `createExam` | Creates a new exam document by an instructor | `req.user.id`, `req.body` (title, duration, scores, ...) | `res.json` (Created exam document) |
| | `updateExam` | Updates details of an existing exam | `req.params.id`, `req.body` (modified fields) | `res.json` (Updated exam document) |
| | `togglePublish` | Toggles exam publish state and broadcasts real-time notification | `req.params.id` | `res.json` (New publish state `isPublished`) |
| | `deleteExam` | Deletes an exam (restricted to instructor or admin) | `req.params.id` | `res.json` (Deletion success message) |
| **questionController**| `getAllQuestions` | Fetches question bank for instructor (supporting search and category filters) | `req.user.id`, `req.query` (search, category) | `res.json` (List of questions) |
| | `getQuestionStats` | Fetches statistical metrics for a question (correct/incorrect counts) | `req.params.id` | `res.json` (Success rates and answer breakdowns) |
| | `createQuestion` | Creates a new question in the question bank (MCQ / TrueFalse) | `req.user.id`, `req.body` (text, type, options, correct...) | `res.json` (Created question document) |
| | `updateQuestion` | Updates details of a question in the question bank | `req.params.id`, `req.body` (modified fields) | `res.json` (Updated question document) |
| | `deleteQuestion` | Deletes a question from the question bank | `req.params.id` | `res.json` (Deletion success message) |
| | `addToExam` | Links a question to a specific exam | `req.body` (examId, questionId) | `res.json` (Success message + Exam details) |
| | `removeFromExam` | Unlinks a question from a specific exam | `req.body` (examId, questionId) | `res.json` (Success message + Exam details) |
| **attemptController**| `getAttemptHistory`| Fetches student's past exam attempt history | `req.user.id` | `res.json` (List of student attempts) |
| | `startExam` | Initiates a new exam attempt (or resumes an in-progress attempt) | `req.user.id`, `req.body` (examId) | `res.json` (Attempt document + Questions without correct answers) |
| | `saveAnswer` | Auto-saves a student's answer during an active exam attempt | `req.params.id` (attemptId), `req.body` (questionId, answer) | `res.json` (Instant save success message) |
| | `submitExam` | Terminates exam attempt, auto-grades answers, calculates score, and issues certificate | `req.params.id` (attemptId) | `res.json` (Final Score + Certificate details if passing) |
| | `logCheatEvent` | Logs cheat events (tab switching, exiting fullscreen) and auto-terminates exam upon reaching 3 violations | `req.params.id` (attemptId), `req.body` (eventType) | `res.json` (Violation log + exam termination status) |
| | `getViolations` | Fetches cheat violation logs for a specific attempt (for instructor/admin) | `req.params.id` (attemptId) | `res.json` (List of CheatLog documents for the attempt) |
| | `abandonAttempt` | Cancels or abandons an in-progress exam attempt | `req.params.id` (attemptId) | `res.json` (Attempt status updated to `abandoned`) |
| **resultController**| `getMyHistory` | Fetches list of current student result summaries | `req.user.id` | `res.json` (List of results and metrics) |
| | `getMyResult` | Fetches specific attempt result for student with answer details and explanations | `req.user.id`, `req.params.attemptId` | `res.json` (Detailed questions, correct answers, and explanations) |
| | `getExamAttempts`| Fetches all completed attempts and results for a specific exam (instructor/admin) | `req.params.examId` | `res.json` (List of all student attempts for the exam) |
| | `getAttemptDetail`| Fetches full attempt details and answers of a specific student for instructor/admin | `req.params.attemptId` | `res.json` (Comprehensive attempt details) |
| | `exportCSV` | Exports student exam results as a downloadable CSV file | `req.params.examId` | `res.download` (Formatted CSV file) |
| | `exportPDF` | Exports student exam results as a direct PDF stream | `req.params.examId` | `res.setHeader` + PDF Stream (Formatted PDF file) |
| | `updateManualGrade`| Manually updates the score for a specific question by an instructor | `req.params` (attemptId, questionId), `req.body` (score) | `res.json` (Updated attempt result details) |
| **leaderboardController**| `getLeaderboard` | Fetches honor roll leaderboard (top scores and fastest times) for an exam | `req.params.examId` | `res.json` (Top attempts sorted by score & time) |
| | `getExamStats` | Fetches advanced instructor analytics for an exam (average scores, pass rates) | `req.params.examId` | `res.json` (Advanced stats via MongoDB Aggregation) |
| | `getAdminOverview`| Fetches platform-wide summary metrics for admins (total users, total exams) | `req.user` (must be admin) | `res.json` (Platform summary metrics) |
| **certificateController**| `verifyCertificate`| Publicly verifies certificate authenticity via unique UUID (no login required) | `req.params.certId` | `res.json` (Certificate details, student name, and exam title) |
| | `getMyCertificates`| Fetches all earned certificates for the authenticated student | `req.user.id` | `res.json` (List of student certificates) |
| | `getCertificateById`| Fetches a specific certificate by standard database ID | `req.params.id` | `res.json` (Certificate data) |
| **notificationController**| `getNotifications`| Fetches all notifications for the authenticated user | `req.user.id` | `res.json` (List of read and unread notifications) |
| | `markOneRead` | Marks a specific notification as read | `req.params.id`, `req.user.id` | `res.json` (Updated notification `read: true`) |
| | `markAllRead` | Marks all notifications of the user as read | `req.user.id` | `res.json` (Success message confirming all updated) |
| | `deleteNotification`| Deletes a specific notification | `req.params.id`, `req.user.id` | `res.json` (Deletion success message) |
| **adminController**| `getAllUsers` | Fetches list of all registered platform users for admin | `req.user` (admin) | `res.json` (List of users) |
| | `updateUserRole` | Promotes or modifies user role (student, instructor, admin, organization) | `req.params.id`, `req.body` (role) | `res.json` (Updated user document) |
| | `toggleUserActive`| Instantly activates or deactivates a user account | `req.params.id` | `res.json` (User active state `isActive`) |
| | `deleteUser` | Deletes a user account and associated records entirely from the system | `req.params.id` | `res.json` (Deletion success message) |
| | `getAllExamsAdmin`| Fetches all exams across the platform for admin | `req.user` (admin) | `res.json` (List of all exams) |
| | `deleteExamAdmin`| Deletes any exam across the platform for admin | `req.params.id` | `res.json` (Deletion success message) |
| **aiController** | `getAiHealth` | Verifies operational status of Google Gemini AI service | `req.user` | `res.json` (Service connection status `Status: OK`) |
| | `gradeWritten` | Grades a single written/essay question via AI | `req.params` (attemptId, questionId) | `res.json` (Score + AI evaluation feedback) |
| | `gradeAllWritten` | Batch grades all written questions in an attempt via AI | `req.params.attemptId` | `res.json` (Updated attempt scores) |
| | `runCodeSandbox` | Executes source code inside an isolated sandboxed environment | `req.body` (code, language) | `res.json` (Execution output/errors) |
| | `submitCode` | Submits student source code for automated test case grading | `req.params` (attemptId, questionId), `req.body` | `res.json` (Calculated code evaluation score) |
| | `tutorChat` | Interacts with AI Tutor for concept explanation or hints | `req.user.id`, `req.body` (examId, message) | `res.json` (AI Tutor response) |
| | `getTutorHistory`| Fetches student chat history with AI Tutor for a specific exam | `req.user.id`, `req.params.examId` | `res.json` (Previous chat logs) |
| | `clearTutorHistory`| Clears student chat history with AI Tutor | `req.user.id`, `req.params.examId` | `res.json` (Chat deletion success message) |
| | `generateAiQuestions`| Generates exam questions via AI based on target topic | `req.body` (topic, difficulty, count, type) | `res.json` (Proposed questions from Gemini) |
| | `saveAiQuestions`| Saves AI-generated questions directly into the question bank | `req.user.id`, `req.body` (questions array) | `res.json` (List of questions saved in database) |
| | `runCheatAnalysis`| Runs AI-powered cheat analysis on a student attempt | `req.params.attemptId` | `res.json` (Cheat probability report and behavioral analysis) |
| | `getCheatAnalysis`| Fetches saved cheat analysis report for an attempt | `req.params.attemptId` | `res.json` (Saved report from DB) |
| | `runPerformanceAnalysis`| Generates AI student performance analysis (strengths and weaknesses) | `req.params.attemptId` | `res.json` (Comprehensive performance report and recommendations) |
| | `getPerformanceAnalysis`| Fetches saved performance report for an attempt | `req.params.attemptId` | `res.json` (Saved report from DB) |
| | `runPlagiarismDetection`| Compares student answers to detect copying and similarity (Plagiarism) | `req.params.examId` | `res.json` (Similarity report and shared copying percentages) |
| | `getPlagiarismReport`| Fetches saved plagiarism report for a specific exam | `req.params.examId` | `res.json` (Saved report from DB) |
| **organizationController**| `getProfile` | Fetches current organization profile | `req.org` (from orgMiddleware) | `res.json` (Organization details) |
| | `updateProfile` | Updates organization name or settings | `req.org._id`, `req.body` | `res.json` (Updated organization document) |
| | `uploadLogo` | Saves organization logo file path after upload | `req.org._id`, `req.file` | `res.json` (Logo URL) |
| | `getDashboard` | Fetches organization metrics (instructor count, student count, subscription state) | `req.org._id` | `res.json` (Organization Dashboard metrics) |
| | `getInstructors` | Fetches organization instructors (requires active subscription) | `req.org._id` | `res.json` (List of organization instructors) |
| | `createInstructor`| Adds a new instructor to the organization | `req.org._id`, `req.body` (name, email) | `res.json` (Created instructor details) |
| | `updateInstructor`| Updates details of an organization instructor | `req.params.id`, `req.body` | `res.json` (Updated instructor document) |
| | `toggleInstructorActive`| Activates or suspends an instructor account in the organization | `req.params.id` | `res.json` (Account active state `isActive`) |
| | `deleteInstructor`| Removes an instructor from the organization | `req.params.id` | `res.json` (Deletion success message) |
| | `resendInstructorInvite`| Resends invitation email to an instructor | `req.params.id` | `res.json` (Resend success message) |
| | `getStudents` | Fetches organization students (requires active subscription) | `req.org._id` | `res.json` (List of organization students) |
| | `createStudent` | Adds a new student to the organization | `req.org._id`, `req.body` (name, email) | `res.json` (Created student details) |
| | `updateStudent` | Updates details of an organization student | `req.params.id`, `req.body` | `res.json` (Updated student document) |
| | `toggleStudentActive`| Activates or suspends a student account in the organization | `req.params.id` | `res.json` (Account active state `isActive`) |
| | `deleteStudent` | Removes a student from the organization | `req.params.id` | `res.json` (Deletion success message) |
| | `resendStudentInvite`| Resends invitation email to a student | `req.params.id` | `res.json` (Resend success message) |
| **stripeController**| `createCheckout` | Creates a Stripe Checkout Session to purchase organization subscription | `req.org`, `req.body` (priceId) | `res.json` (Stripe Checkout URL) |
| | `getBillingPortal`| Generates a Stripe Billing Portal management link | `req.org` | `res.json` (Billing Portal URL) |
| | `getSubscription` | Fetches current organization subscription details | `req.org` | `res.json` (Subscription data and status) |
| | `cancelSubscription`| Cancels organization subscription | `req.org` | `res.json` (Subscription data and cancellation status) |
| | `handleWebhook` | Handles incoming Stripe webhook events (renewal, payment, cancellation) | `req.body` (Raw Buffer), `req.headers['stripe-signature']` | `res.json` (`{ received: true }`) |

---

### 2. Middleware

| Middleware Name | Description | Input Parameters | Output / Action |
| :--- | :--- | :--- | :--- |
| `authMiddleware.protect` | Verifies JWT token validity in authorization header and checks account active status (`isActive`) | `req.headers.authorization` | Injects `req.user` + calls `next()` (or returns 401 Unauthorized) |
| `authMiddleware.authorize` | Verifies that authenticated user role (`role`) matches required roles for the endpoint | `req.user.role`, Required roles (e.g. `instructor`) | Calls `next()` (or returns 403 Forbidden) |
| `orgMiddleware.loadOrganization` | Fetches organization details linked to the current organization owner | `req.user.id` | Injects `req.org` + calls `next()` (or returns 404 Not Found) |
| `orgMiddleware.requireActiveSubscription` | Verifies organization subscription is active (`active` or `trialing`) to access premium features | `req.org.subscriptionStatus` | Calls `next()` (or returns 403 Subscription Required) |
| `rateLimiter.authLimiter` | Limits authentication attempts (e.g. login/register) to 10 requests per 15 minutes (1000 in dev mode) | `req.ip` | Calls `next()` (or returns 429 Too Many Requests) |
| `rateLimiter.apiLimiter` | Limits general API requests to 2000 requests per 15 minutes | `req.ip` | Calls `next()` (or returns 429 Too Many Requests) |
| `uploadMiddleware` | Initializes `Multer` for file uploads, validating image format and size (max 2MB) | `req.file` (form-data) | Saves file locally in `uploads/` + injects `req.file` + calls `next()` |

---

### 3. Services

| Service Name | Description | Input Parameters | Output / Return Value |
| :--- | :--- | :--- | :--- |
| `geminiService` | Direct wrapper for Google Gemini AI API communicating system instructions and prompts | `prompt`, `systemInstruction` | AI generated text string (Text Generation) |
| `cheatAnalysisService` | Evaluates cheat log histories to calculate cheat probability via AI | `attempt`, `cheatLogs` | JSON object containing cheat percentage and behavioral evaluation |
| `codeGraderService` | Executes code across multiple languages in a sandbox, evaluating against test cases | `code`, `language`, `testCases` | Execution outputs, calculated grade score, and error logs |
| `performanceService` | Generates AI student performance analysis outlining strengths and weaknesses | `attempt`, `exam`, `questions` | Performance report with strengths, weaknesses, and recommendations |
| `plagiarismService` | Compares student answers across an exam to calculate similarity and detect copying | `examId`, `attempts` | List of match occurrences and similarity percentage between pairs |
| `questionGenService` | Generates exam questions (MCQ / TrueFalse) via Gemini AI | `topic`, `difficulty`, `count`, `type` | JSON array containing questions, options, and correct answers |
| `stripeService` | Wrapper for official Stripe library managing checkout sessions and billing portals | `priceId`, `customerId`, `orgId` | Payment session links `url` or Stripe subscription objects |
| `tutorService` | Manages AI Tutor interactive dialogues, offering educational guidance without revealing answers | `chatHistory`, `newMessage`, `examContext` | AI Tutor response string |
| `writtenGraderService`| Evaluates essay/written answers against rubrics to assign AI estimated scores | `studentAnswer`, `rubric`, `maxScore` | Calculated score + evaluation reasoning (Explanation) |

---

### 4. Utils

| Util Name | Description | Input Parameters | Output / Action |
| :--- | :--- | :--- | :--- |
| `socket.initSocket` | Initializes Socket.io server, attaching to HTTP server and enforcing JWT authentication | `httpServer` | Instantiates WebSocket Server and manages active connections |
| `socket.emitToUser` | Broadcasts real-time events to all active tabs/screens of a specific user | `userId`, `event`, `data` | Dispatches WebSocket payload to target user |
| `socket.emitToAll` | Broadcasts real-time events to all connected users across the platform | `event`, `data` | Dispatches WebSocket payload globally (e.g. upon publishing an exam) |
| `emailService.sendEmail`| Sends email messages (e.g. OTP verification codes) via Nodemailer (Gmail/Resend) | `to`, `subject`, `text`, `html` | Transmits email and returns success status |
| `generateToken` | Generates encrypted JWT token payload signed with application secret | `userId`, `expiresIn`, `purpose` | Encrypted token string (JWT Token) |
| `errorUtils.AppError` | Custom error extension class attaching HTTP status codes to error instances | `message`, `statusCode` | Custom error instance (`Error object`) |
| `errorUtils.globalErrorHandler` | Express Global Error Handler intercepting errors and formatting unified JSON error responses | `err`, `req`, `res`, `next` | Returns `res.status(err.statusCode).json(...)` |
| `similarityUtils` | Calculates text string similarity scores using string comparison algorithms | `textA`, `textB` | Numeric similarity ratio (from 0 to 1) |
| `constants` | System constants file defining supported cheat violation types | None | Constants array `VIOLATION_TYPES` |
