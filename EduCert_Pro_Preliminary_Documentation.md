# EduCert Pro — Online Examination & Certification System

## Preliminary Documentation

---

**Project Title:** EduCert Pro — Online Examination & Certification System

**Version:** 1.1.0 (Phases 1–11)

**Date:** June 2026

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Problem Definition](#3-problem-definition)
4. [System Architecture & Technologies](#4-system-architecture--technologies)
5. [Implementation & Dependencies](#5-implementation--dependencies)
6. [Achievements & Progress](#6-achievements--progress)
7. [Future Work](#7-future-work)
8. [References](#8-references)

---

## 1. Abstract

EduCert Pro is a full-stack web-based online examination and certification platform designed to digitize the end-to-end lifecycle of academic and professional assessments. The system provides a comprehensive solution that enables instructors to create, manage, and publish examinations with configurable parameters (duration, scoring, multiple attempts, and question shuffling), while students can browse available exams, take timed assessments with real-time auto-saving, and receive instant automated grading with detailed per-question feedback.

The platform implements a robust three-tier role-based access control model (Student, Instructor, Admin) and incorporates advanced features including a client-side anti-cheat proctoring engine with server-side enforcement, automated digital certificate generation with public UUID-based verification, real-time WebSocket notifications via Socket.io, PDF and CSV result export capabilities, per-exam leaderboards with MongoDB aggregation pipelines, platform-wide analytics, and a fully responsive UI with dark mode support. The system follows a decoupled architecture with a RESTful Node.js/Express backend connected to MongoDB and a React/Vite single-page application frontend, designed for maintainability, security, and scalability.

---

## 2. Introduction

### 2.1 Background

The rapid acceleration of digital learning — driven by global events, remote education adoption, and the growing demand for lifelong professional development — has created an urgent need for reliable, secure, and user-friendly online assessment platforms. Traditional paper-based examinations suffer from logistical constraints including physical presence requirements, manual grading delays, and the inability to scale across geographies. Existing digital solutions often lack critical features such as anti-cheat mechanisms, real-time notifications, or automated certification workflows, forcing institutions to cobble together multiple disconnected tools.

### 2.2 Project Scope

EduCert Pro addresses these gaps by providing an integrated, self-contained platform that covers the full examination lifecycle:

- **Authoring:** Instructors create exams with configurable parameters and manage a reusable question bank supporting Multiple Choice (MCQ) and True/False question types.
- **Delivery:** Students take timed exams in a proctored, fullscreen environment with continuous auto-save and client-side anti-cheat monitoring.
- **Assessment:** Automated, server-side grading produces instant results with per-question breakdowns, explanations, and pass/fail determination.
- **Certification:** Passing students automatically receive digitally verifiable certificates with unique UUID identifiers.
- **Analytics:** Instructors access per-exam statistics (pass rates, question difficulty analysis), leaderboards, and exportable reports (CSV and PDF).
- **Administration:** A dedicated admin panel provides platform-wide user management, role assignment, and oversight capabilities.

### 2.3 Context

The system is developed as a full-stack web application using the MERN stack (MongoDB, Express.js, React, Node.js) with modern tooling (Vite, Socket.io, TailwindCSS via CDN, Material Design 3 theming). Development followed an iterative, phased methodology spanning 11 phases — from core authentication and exam CRUD through to real-time notifications, dark mode, and responsive design.

---

## 3. Problem Definition

### 3.1 The Problem

Educational institutions and professional training organizations face a recurring set of challenges when conducting assessments digitally:

1. **Exam Integrity:** Without proctoring, online exams are susceptible to cheating through tab-switching, copy-pasting, and use of external resources. Most solutions either lack anti-cheat entirely or require expensive third-party proctoring services.

2. **Manual Grading Bottleneck:** Even when exams are delivered digitally, the grading and result-distribution process often remains manual, introducing delays of days or weeks and a significant administrative burden.

3. **Fragmented Toolchains:** Institutions typically use separate tools for exam creation, delivery, grading, certificate issuance, and analytics — leading to data silos, inconsistent user experiences, and increased operational complexity.

4. **Certificate Verification:** Traditional certificates are easily forged and difficult to verify. Employers and third parties have no standardized way to confirm the authenticity of a claimed credential.

5. **Lack of Real-Time Feedback:** Students often wait extended periods for results and notifications, reducing engagement and the pedagogical value of timely feedback.

6. **Accessibility and Responsiveness:** Many existing platforms were designed for desktop-only environments and fail to provide a seamless experience on mobile devices or across different user preferences (e.g., dark/light themes).

### 3.2 Significance

These problems collectively undermine the credibility, efficiency, and accessibility of online education. By addressing all of them within a single integrated platform, EduCert Pro reduces institutional overhead, improves student experience, strengthens exam integrity, and provides a verifiable credentialing mechanism — contributing directly to the broader goal of trustworthy digital education.

---

## 4. System Architecture & Technologies

### 4.1 High-Level Architecture

EduCert Pro follows a **decoupled client–server architecture** with clear separation between the frontend (presentation layer), the backend (business logic and API layer), and the database (persistence layer). Real-time communication is handled through a dedicated WebSocket channel running on the same HTTP server.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  React SPA    │  │  Axios HTTP  │  │  Socket.io Client    │  │
│  │  (Vite Build) │──│  API Client  │  │  (Real-time Events)  │  │
│  │  27 Pages     │  │  JWT Bearer  │  │  Singleton Socket    │  │
│  └───────────────┘  └──────┬───────┘  └──────────┬───────────┘  │
│                            │                      │              │
└────────────────────────────┼──────────────────────┼──────────────┘
                             │  REST (HTTP)          │  WebSocket
                             ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js)                             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Express.js  │  │  Middleware   │  │  Socket.io Server     │  │
│  │  10 Route    │──│  • JWT Auth   │  │  • JWT Handshake Auth │  │
│  │  Modules     │  │  • Rate Limit │  │  • User-Socket Map    │  │
│  │  10 Control. │  │  • File Upload│  │  • emitToUser/All     │  │
│  └──────┬──────┘  └──────────────┘  └────────────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  Service Layer (Utils)                                       ││
│  │  • Email Service (Nodemailer/Gmail SMTP)                     ││
│  │  • Token Generator (JWT)                                     ││
│  │  • PDF Generator (PDFKit)                                    ││
│  │  • Error Handler (AppError + Global Middleware)               ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────┬───────────────────────────────────┘
                              │  Mongoose ODM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (MongoDB)                         │
│  Collections: Users, Exams, Questions, Attempts,                │
│               Certificates, CheatLogs, Notifications            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Use Case Diagram

The system supports three actor roles with the following primary use cases:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EduCert Pro System                           │
│                                                                     │
│  ┌─────────┐                                       ┌─────────────┐ │
│  │ Student │───── Browse & Start Exams             │  Instructor  │ │
│  │         │───── Take Timed Exam (Anti-Cheat)     │             │ │
│  │         │───── View Results & Review Answers     │──── Create/ │ │
│  │         │───── View Leaderboard                  │     Edit    │ │
│  │         │───── View/Download Certificates        │     Exams   │ │
│  │         │───── Receive Notifications             │──── Manage  │ │
│  │         │───── Manage Profile & Photo            │     Question│ │
│  └─────────┘                                       │     Bank    │ │
│                                                     │──── View    │ │
│  ┌─────────┐                                       │     Student │ │
│  │  Admin  │───── Manage All Users (CRUD, Roles)   │     Results │ │
│  │         │───── Manage All Exams                  │──── Export  │ │
│  │         │───── View Platform Statistics          │   CSV/PDF   │ │
│  │         │───── View Admin Dashboard              │──── View    │ │
│  └─────────┘                                       │     Stats   │ │
│                                                     └─────────────┘ │
│  ┌─────────┐                                                        │
│  │ Public  │───── Verify Certificate (by UUID)                      │
│  └─────────┘                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Data Model (Entity Relationships)

The MongoDB database contains seven collections represented by Mongoose schemas:

| Collection       | Key Fields                                                    | Relationships                          |
|-----------------|---------------------------------------------------------------|----------------------------------------|
| **User**        | name, email, password (hashed), role, isActive, profilePhoto, OTP fields | Referenced by Exam, Attempt, Certificate, Notification |
| **Exam**        | title, description, category, duration, totalScore, passingScore, maxAttempts, shuffle, isPublished | Belongs to Instructor (User); has many Questions |
| **Question**    | text, type (mcq/truefalse), options[], correctAnswer, explanation, category, tags | Belongs to Instructor; referenced by Exam.questions[] |
| **Attempt**     | status, savedAnswers[], startedAt, submittedAt, score, passed, timeTaken, attemptNumber, perQuestionResult[] | Belongs to Student & Exam; has many CheatLogs |
| **Certificate** | certId (UUID), score, issuedAt                                | Belongs to Student, Exam, and Attempt (unique per attempt) |
| **CheatLog**    | eventType (tab-switch, fullscreen-exit, copy, paste, right-click), detectedAt | Belongs to Attempt and Student |
| **Notification**| type (result, certificate, new-exam, system), message, read, refId | Belongs to User |

### 4.4 Technology Stack

| Layer          | Technology                  | Version   | Purpose                                      |
|----------------|-----------------------------|-----------|----------------------------------------------|
| **Runtime**    | Node.js                     | 18+       | Server-side JavaScript execution             |
| **Backend Framework** | Express.js           | 4.18.2    | REST API routing, middleware pipeline        |
| **Database**   | MongoDB                     | 6+        | Document-oriented data persistence           |
| **ODM**        | Mongoose                    | 8.0.3     | Schema modeling, validation, query building  |
| **Authentication** | JSON Web Tokens (JWT)   | 9.0.2     | Stateless auth with signed tokens            |
| **Password Hashing** | bcryptjs             | 2.4.3     | Secure password hashing (10 salt rounds)     |
| **Real-Time**  | Socket.io                   | 4.7.2     | Bidirectional WebSocket communication        |
| **Email**      | Nodemailer                  | 6.9.7     | SMTP-based OTP delivery (Gmail/Resend)       |
| **PDF Export** | PDFKit                      | 0.14.0    | Server-side PDF generation and streaming     |
| **File Upload**| Multer                      | 1.4.5     | Multipart form-data handling for photos      |
| **Rate Limiting** | express-rate-limit       | 7.1.5     | Brute-force protection on auth endpoints     |
| **UUID**       | uuid                        | 9.0.0     | Certificate ID generation (v4)               |
| **Frontend Framework** | React              | 18.2.0    | Component-based UI with hooks                |
| **Build Tool** | Vite                        | 5.0.0     | Fast HMR development server and bundler      |
| **Routing**    | React Router DOM            | 6.20.1    | Client-side routing with protected routes    |
| **HTTP Client**| Axios                       | 1.6.2     | Promise-based HTTP requests with interceptors|
| **Icons**      | React Icons                 | 5.6.0     | Icon library for UI elements                 |
| **Socket Client** | socket.io-client         | 4.7.2     | Frontend WebSocket connection                |
| **CSS**        | TailwindCSS (CDN)           | 3.x       | Utility-first styling with custom config     |
| **Typography** | Google Fonts (Inter)        | —         | Modern sans-serif typeface                   |
| **Icons (Material)** | Material Symbols Outlined | —    | Google Material Design icon font             |
| **Design System** | Material Design 3 / Material You | — | CSS variable-based theming (light/dark)      |

---

## 5. Implementation & Dependencies

### 5.1 Backend Implementation

#### 5.1.1 Server Architecture

The backend follows an **MVC-inspired layered architecture**:

- **Entry Point** (`server.js`): Creates an HTTP server (via Node's `http` module rather than `app.listen`) so both Express and Socket.io can share the same port (5000). Registers all middleware and route modules.
- **Routes** (10 modules): Define HTTP method + path mappings and attach middleware guards (`protect`, `authorize`, `authLimiter`).
- **Controllers** (10 modules): Contain all business logic, each function handling a single API endpoint.
- **Models** (7 schemas): Define MongoDB document structure with Mongoose validators, pre-save hooks, and instance methods.
- **Middleware** (3 modules): `authMiddleware.js` (JWT verification + role authorization), `rateLimiter.js` (IP-based rate limiting), `uploadMiddleware.js` (Multer file handling with type and size validation).
- **Utils** (5 modules): `socket.js` (Socket.io wrapper), `emailService.js` (Nodemailer transporter), `generateToken.js` (JWT signing), `errorUtils.js` (AppError class + global error handler), `constants.js` (violation type enum).

#### 5.1.2 Authentication & Security

The authentication system implements multiple security best practices:

- **Password Hashing:** bcryptjs with 10 salt rounds via a Mongoose `pre('save')` hook — passwords are never stored in plaintext and never re-hashed on non-password updates.
- **JWT Tokens:** Signed with HS256, configurable expiry (default 7 days). Tokens carry only `{ id: userId }` as payload.
- **Timing Attack Prevention:** Login uses a dummy bcrypt comparison when the email is not found, ensuring response time is constant regardless of whether the email exists.
- **Uniform Error Messages:** Login returns the same "Invalid email or password" message for both wrong-email and wrong-password cases, preventing account enumeration.
- **OTP Password Reset:** A 3-step flow (request OTP → verify OTP → reset password) using SHA-256 hashed OTPs stored in the database with 10-minute expiry. The reset endpoint requires a purpose-scoped JWT (`purpose: 'reset_password'`) to prevent normal login tokens from being used to reset passwords.
- **Account Deactivation:** The `protect` middleware checks `user.isActive` on every request, allowing admins to instantly lock accounts mid-session.
- **Rate Limiting:** Strict limiter (10 requests/15 min) on auth routes; soft limiter (2000 requests/15 min) on all API routes.

#### 5.1.3 Anti-Cheat System

The anti-cheat system operates as a client–server tandem:

**Client-side (React custom hook `useAntiCheat`):**
- Enters fullscreen mode when the exam starts.
- Monitors five violation types: tab-switch (via `visibilitychange` + `blur`), fullscreen-exit (via `fullscreenchange`), copy, paste, and right-click (via DOM events).
- Implements a 3-second activation delay to prevent false positives from browser initialization events.
- Throttles reports to one per 2 seconds to avoid duplicate alerts.
- Displays warnings with remaining violation count and auto-submit alerts.

**Server-side (Attempt Controller `logCheatEvent`):**
- Validates violation type against a whitelist constant.
- Creates a `CheatLog` document per violation.
- Counts total violations for the attempt; auto-submits and grades the exam after 3 violations.
- Instructors can view the full violation log per attempt.

#### 5.1.4 Exam Lifecycle & Grading

The exam lifecycle follows a defined state machine:

1. **Draft** → Instructor creates exam (`isPublished: false`).
2. **Published** → Instructor toggles publish; all students receive a real-time Socket.io notification.
3. **Attempt Started** → Student calls `POST /attempts/start`; existing in-progress attempts are resumed (not duplicated).
4. **In-Progress** → Answers auto-save on every selection via `PATCH /attempts/:id/save-answer`.
5. **Submitted** → Grading occurs server-side using a shared `gradeAttempt()` helper: `score = (correctCount / totalQuestions) * totalScore`, rounded to nearest integer.
6. **Certificate Issued** → If `score ≥ passingScore`, a Certificate is automatically created with a UUID `certId`.
7. **Notification Sent** → Result notification pushed via Socket.io and persisted in Notifications collection.

Attempt statuses: `in-progress`, `submitted`, `timed-out`, `auto-submitted`, `abandoned`.

#### 5.1.5 Real-Time Notifications (Socket.io)

- The Socket.io server attaches to the same HTTP server as Express (no additional port).
- JWT-based authentication occurs during the WebSocket handshake via `io.use()` middleware.
- An in-memory `Map<userId, Set<socketId>>` tracks all connected sockets per user (supporting multiple tabs).
- `emitToUser(userId, event, payload)` sends events to a specific user's sockets.
- `emitToAll(event, payload)` broadcasts to all connected clients (used for new exam notifications).
- Notifications are both persisted to MongoDB (for the bell/inbox) and pushed in real-time (for instant toast popups).

#### 5.1.6 PDF Export

Results export uses PDFKit to stream A4-formatted PDFs directly to the HTTP response with no temporary files. The PDF includes a branded header, summary statistics (pass rate, average score), and a formatted table with row separators and automatic page breaks.

### 5.2 Frontend Implementation

#### 5.2.1 Application Structure

The React SPA is organized into:
- **27 Page Components** — covering all student, instructor, and admin workflows.
- **3 Shared Components** — `AppLayout.jsx` (sidebar wrapper), `ProtectedRoute.jsx` (role-guarded route), `Sidebar.jsx` (navigation + dark mode toggle + notification bell).
- **2 Context Providers** — `AuthContext.jsx` (user state, token, login/logout, socket connection), `ThemeContext.jsx` (dark/light toggle persisted to localStorage).
- **1 Custom Hook** — `useAntiCheat.js` (exam proctoring engine).
- **2 API Modules** — `axios.js` (Axios instance with Bearer token interceptor), `socket.js` (Socket.io singleton).

#### 5.2.2 Routing & Access Control

React Router v6 handles client-side routing with the `ProtectedRoute` component enforcing role-based access. Routes are grouped by role:
- **Public routes:** Login, Register, Forgot Password, Certificate Verification.
- **Student routes (9):** Dashboard, Exam List, Exam Detail, Exam Interface, History, Result Detail, Leaderboard, Certificates, Notifications.
- **Instructor routes (9):** Dashboard, My Exams, Create Exam, Edit Exam, Question Manager, Question Bank, Results (per exam), Attempt Detail, Exam Statistics.
- **Admin routes (3):** Dashboard, User Management, Exam Management.
- **Shared routes (2):** Profile, Notifications.

#### 5.2.3 Design System & Theming

The UI follows **Material Design 3 (Material You)** principles:
- **CSS Variable Theming:** 20+ design tokens (primary, surface, on-surface, error, etc.) defined as CSS variables on `:root` (light) and `html.dark` (dark), consumed by Tailwind's extended color config.
- **Dark Mode:** Toggle in sidebar persisted to `localStorage` via `ThemeContext`. Adding/removing the `dark` class on `<html>` re-themes the entire UI without per-component dark variants.
- **Typography:** Google Fonts Inter with a custom type scale (display-sm, h1–h3, body-lg, body-md, label-md, label-sm).
- **Responsive Design:** Mobile breakpoint at 768px triggers an off-canvas sidebar drawer with a hamburger menu top bar.

### 5.3 External Dependencies Declaration

> [!IMPORTANT]
> All external libraries, modules, and services used in the project are explicitly listed below. **No AI modules, third-party APIs, or external services beyond those listed are integrated.**

#### 5.3.1 Backend Dependencies (Production)

| Package                | Version  | License    | Purpose                                             |
|------------------------|----------|------------|-----------------------------------------------------|
| `express`              | ^4.18.2  | MIT        | Web framework for REST API routing and middleware    |
| `mongoose`             | ^8.0.3   | MIT        | MongoDB ODM for schema definition and queries       |
| `bcryptjs`             | ^2.4.3   | MIT        | Password hashing using bcrypt algorithm              |
| `jsonwebtoken`         | ^9.0.2   | MIT        | JWT creation and verification for authentication    |
| `cors`                 | ^2.8.5   | MIT        | Cross-Origin Resource Sharing middleware             |
| `dotenv`               | ^16.3.1  | BSD-2      | Environment variable loading from `.env` file        |
| `express-rate-limit`   | ^7.1.5   | MIT        | IP-based rate limiting for brute-force protection   |
| `multer`               | ^1.4.5   | MIT        | File upload handling (profile photo uploads)        |
| `nodemailer`           | ^6.9.7   | MIT        | SMTP email transport for OTP delivery               |
| `uuid`                 | ^9.0.0   | MIT        | UUID v4 generation for certificate identifiers       |
| `pdfkit`               | ^0.14.0  | MIT        | PDF document creation for results export            |
| `socket.io`            | ^4.7.2   | MIT        | WebSocket server for real-time notifications        |

#### 5.3.2 Backend Dependencies (Development)

| Package     | Version | License | Purpose                                   |
|-------------|---------|---------|-------------------------------------------|
| `nodemon`   | ^3.0.2  | MIT     | Auto-restart server on file changes       |

#### 5.3.3 Frontend Dependencies (Production)

| Package              | Version  | License | Purpose                                        |
|----------------------|----------|---------|------------------------------------------------|
| `react`              | ^18.2.0  | MIT     | UI component library with hooks                |
| `react-dom`          | ^18.2.0  | MIT     | React DOM renderer                             |
| `react-router-dom`   | ^6.20.1  | MIT     | Client-side routing with protected routes      |
| `axios`              | ^1.6.2   | MIT     | HTTP client with interceptors for API calls    |
| `react-icons`        | ^5.6.0   | MIT     | Icon components for UI elements                |
| `socket.io-client`   | ^4.7.2   | MIT     | WebSocket client for real-time events          |

#### 5.3.4 Frontend Dependencies (Development)

| Package                | Version | License | Purpose                                |
|------------------------|---------|---------|----------------------------------------|
| `vite`                 | ^5.0.0  | MIT     | Build tool and development server      |
| `@vitejs/plugin-react` | ^4.2.0  | MIT     | React Fast Refresh for Vite            |

#### 5.3.5 CDN Dependencies

| Resource                     | Source          | Purpose                                |
|------------------------------|-----------------|----------------------------------------|
| TailwindCSS (with Forms plugin) | cdn.tailwindcss.com | Utility-first CSS framework        |
| Google Fonts — Inter          | fonts.googleapis.com | Typography                        |
| Material Symbols Outlined     | fonts.googleapis.com | Material Design icon font         |

#### 5.3.6 External Services

| Service     | Usage                        | Configuration                    |
|-------------|------------------------------|----------------------------------|
| Gmail SMTP  | Sending password-reset OTPs  | Requires Gmail App Password in `.env` |
| Resend SMTP (optional) | Alternative email provider | Auto-detected by `re_` prefix on EMAIL_PASS |
| MongoDB     | Database server              | Local (`mongodb://localhost:27017`) or Atlas URI |

#### 5.3.7 API Testing

| Tool     | File                           | Purpose                                    |
|----------|--------------------------------|--------------------------------------------|
| Postman  | `EduCert-Pro-Postman.json`     | 60+ pre-configured API test cases with auto-chained variables |

---

## 6. Achievements & Progress

### 6.1 Completed Phases Summary

| Phase | Feature Area                        | Status     |
|-------|-------------------------------------|------------|
| 1     | Authentication (Register, Login, Password Reset) | ✅ Complete |
| 2     | Exam & Question Management (CRUD, Question Bank) | ✅ Complete |
| 3     | Exam Taking (Timer, Auto-Save, Grading)          | ✅ Complete |
| 4     | Anti-Cheat Proctoring System                     | ✅ Complete |
| 5     | Result Review with Per-Question Breakdown        | ✅ Complete |
| 6     | Certificates (Auto-Issue, Public Verification)   | ✅ Complete |
| 7     | Leaderboards & Exam Statistics                   | ✅ Complete |
| 8     | Admin Panel (User/Exam Management, Platform Stats) | ✅ Complete |
| 9     | Instructor Attempt Detail View & PDF Export      | ✅ Complete |
| 10    | Real-Time Notifications (Socket.io)              | ✅ Complete |
| 11    | Dark Mode & Responsive Mobile Layout             | ✅ Complete |

### 6.2 Key Implemented Features

**Authentication & User Management:**
- Secure registration with role control (students, instructors; admin created via DB or promotion).
- Login with timing-attack-resistant password comparison and uniform error messages.
- Three-step OTP password reset flow with hashed OTP storage and purpose-scoped JWT tokens.
- Profile management with photo upload (JPEG, PNG, WebP; 2MB limit).
- Account deactivation with mid-session enforcement.

**Exam Management:**
- Full CRUD for exams with draft/published workflow.
- Configurable exam parameters: duration, total score, passing score, max attempts, question shuffle.
- Reusable question bank with search and category filtering.
- MCQ (with validation that `correctAnswer` is in `options`) and True/False question types.
- Publish toggle with automatic student notification broadcast.

**Exam Taking & Grading:**
- Real-time countdown timer using the exam's configured duration.
- Per-answer auto-save on every selection (resilient to browser crashes).
- Resume-on-refresh capability (returns existing in-progress attempt).
- Server-side time validation with a 60-second grace period.
- Automated grading with per-question result storage.

**Anti-Cheat Engine:**
- Five monitored violation types with frontend-backend tandem enforcement.
- Configurable threshold (3 violations) before automatic exam submission.
- 3-second activation delay to prevent false positives.
- Instructor-accessible violation logs per attempt.
- Fullscreen enforcement with graceful degradation.

**Results & Analytics:**
- Detailed result pages with correct/wrong/skipped counts and percentage scores.
- Per-question review showing student answer, correct answer, and explanation.
- Per-exam instructor results view sorted by score (descending) and time (ascending).
- CSV export with manual row generation (no additional library required).
- PDF export using PDFKit with branded headers, summary statistics, and paginated tables.
- Exam statistics: total attempts, pass rate, average score, average time, per-question difficulty analysis.
- Platform-wide admin dashboard with aggregate counters and recent activity feed.

**Certificates:**
- Automatic certificate creation upon passing, with UUID v4 identifier.
- Duplicate prevention via MongoDB unique constraint on `attempt` field.
- Public verification endpoint requiring no authentication.
- Student certificate gallery with exam details and issue date.

**Real-Time Communication:**
- Socket.io with JWT-authenticated handshake.
- In-memory user-to-socket mapping supporting multiple browser tabs.
- Instant notification delivery for results, certificates, and new exam publications.
- Sidebar notification bell with live unread badge count.
- Toast popup notifications with 5-second auto-dismiss.

**UI/UX:**
- Material Design 3 theming with 20+ CSS variable design tokens.
- Dark mode with localStorage persistence and instant re-theming.
- Responsive layout with mobile off-canvas sidebar and hamburger menu.
- Inter font with a custom type scale from display to label sizes.
- Error pages (401 Unauthorized, 404 Not Found).

### 6.3 Testing

- **API Testing:** 60+ Postman test cases organized by endpoint group with auto-chained variables (tokens and IDs propagate automatically through test scripts). Covers positive paths, error cases, and the complete exam lifecycle including the timer/duration bugfix verification.
- **Manual Testing:** Each phase was manually tested through the frontend UI across all three roles.

---

## 7. Future Work

The following features and improvements are planned for the final version:

### 7.1 Planned Features

1. **Open-Ended / Essay Questions:** Support free-text answers with manual or keyword-based grading by instructors, extending the current MCQ/True/False question types.

2. **Question Import/Export:** Allow instructors to import questions from CSV or JSON files and export their question bank for reuse across platforms.

3. **Advanced Analytics Dashboard:** Interactive charts (pass rate trends, score distributions, time-of-day analysis) using a charting library to give instructors deeper pedagogical insights.

4. **Email Notifications:** Extend the notification system to send email alerts (e.g., exam availability, result ready) in addition to the existing in-app real-time notifications.

5. **Exam Scheduling:** Allow instructors to set exam availability windows (start/end dates) and automatic publish/unpublish on schedule.

6. **Student Groups / Cohorts:** Enable instructors to create student groups and assign exams to specific groups rather than all students.

7. **Comprehensive Audit Logging:** Track all administrative actions (role changes, account deactivation, exam deletions) with timestamped audit trails.

### 7.2 Technical Improvements

1. **Automated Testing Suite:** Implement unit tests (Jest/Vitest) and integration tests for backend controllers and frontend components to ensure regression safety.

2. **Production Security Hardening:**
   - Replace TailwindCSS CDN with a build-step integration (PostCSS purge).
   - Restrict Socket.io CORS from `*` to specific allowed origins.
   - Add helmet.js for HTTP security headers.
   - Implement CSRF protection for state-changing operations.
   - Add input sanitization with express-validator or express-mongo-sanitize.

3. **Performance Optimization:**
   - Add database indexes on frequently queried fields (`exam`, `student`, `status` on Attempt; `user` on Notification).
   - Implement pagination on notification and result listing endpoints.
   - Add Redis caching for leaderboard and statistics queries.

4. **Deployment Preparation:**
   - Dockerize both frontend and backend services.
   - Configure CI/CD pipeline for automated build, test, and deploy.
   - Set up MongoDB Atlas with replica sets for production use.
   - Add structured logging (Winston/Pino) replacing `console.log` statements.

5. **Accessibility (a11y):** Audit and improve WCAG 2.1 compliance with ARIA labels, keyboard navigation, and screen reader support across all pages.

---

## 8. References

### 8.1 Technologies & Documentation

1. Node.js Foundation. (2024). *Node.js Documentation*. https://nodejs.org/docs/latest/api/

2. Express.js. (2024). *Express — Node.js Web Application Framework*. https://expressjs.com/

3. MongoDB, Inc. (2024). *MongoDB Manual*. https://www.mongodb.com/docs/manual/

4. Automattic. (2024). *Mongoose ODM v8.x Documentation*. https://mongoosejs.com/docs/guide.html

5. Auth0. (2024). *JSON Web Tokens — Introduction*. https://jwt.io/introduction

6. Socket.io. (2024). *Socket.IO Documentation*. https://socket.io/docs/v4/

7. Meta Platforms, Inc. (2024). *React Documentation*. https://react.dev/

8. Vite. (2024). *Vite — Next Generation Frontend Tooling*. https://vitejs.dev/

9. Remix Software, Inc. (2024). *React Router v6 Documentation*. https://reactrouter.com/

10. TailwindCSS. (2024). *Tailwind CSS Documentation*. https://tailwindcss.com/docs

11. Google. (2024). *Material Design 3 — Design System*. https://m3.material.io/

12. PDFKit. (2024). *PDFKit — A JavaScript PDF Generation Library for Node*. http://pdfkit.org/

13. Nodemailer. (2024). *Nodemailer — Send Emails from Node.js*. https://nodemailer.com/about/

### 8.2 Security References

14. OWASP Foundation. (2024). *OWASP Authentication Cheat Sheet*. https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

15. OWASP Foundation. (2024). *OWASP Top 10 Web Application Security Risks*. https://owasp.org/www-project-top-ten/

16. Auth0. (2024). *Token Best Practices*. https://auth0.com/docs/secure/tokens/token-best-practices

### 8.3 Design & UX References

17. Nielsen, J. (1994). *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/

18. Google. (2024). *Material Symbols and Icons*. https://fonts.google.com/icons

### 8.4 Tools

19. Postman, Inc. (2024). *Postman API Platform*. https://www.postman.com/

20. Axel Rauschmayer. (2023). *JavaScript for Impatient Programmers (ES2022 Edition)*. https://exploringjs.com/impatient-js/
