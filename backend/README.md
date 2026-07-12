# Online Exam & Certification System — Backend

Node.js / Express / MongoDB backend for Phases 1–4.

---

## Phases Covered

| Phase | What it does |
|-------|-------------|
| 1 | Auth: register, login (rate-limited), OTP forgot-password, reset, profile photo upload |
| 2 | Exam management + Question Bank (CRUD, publish toggle, question reuse) |
| 3 | Exam engine: start/resume, auto-save answers, submit, grading, result history |
| 4 | Anti-cheat: log violations, auto-submit after MAX_VIOLATIONS |

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create your .env file
```bash
cp .env.example .env
```
Then fill in your values:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/exam-system
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16char_app_password
NODE_ENV=development
```

> **Gmail App Password**: Go to Google Account → Security → App passwords.
> Generate a 16-character password and paste it as EMAIL_PASS.

### 3. Create the uploads folder
```bash
mkdir -p uploads
```
This is where profile photos will be saved by Multer.

### 4. Run the server
```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

---

## API Endpoints

### Auth  `/api/auth`
| Method | Endpoint | Rate Limited | Description |
|--------|----------|-------------|-------------|
| POST | `/register` | ✅ 10/15min | Register new account |
| POST | `/login` | ✅ 10/15min | Login, returns JWT |
| POST | `/forgot-password` | ✅ 10/15min | Send OTP to email |
| POST | `/verify-reset-otp` | — | Verify OTP, returns resetToken |
| POST | `/reset-password` | — | Reset password (needs resetToken) |

### Users  `/api/users`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/me` | Any | Get own profile |
| PUT | `/me` | Any | Update name / email |
| POST | `/me/photo` | Any | Upload profile photo (multipart/form-data, field: photo) |

### Exams  `/api/exams`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Any | List exams (role-filtered) |
| GET | `/:id` | Any | Single exam with questions |
| POST | `/` | Instructor | Create exam |
| PUT | `/:id` | Instructor | Update exam |
| PATCH | `/:id/publish` | Instructor | Toggle publish/unpublish |
| DELETE | `/:id` | Instructor/Admin | Delete exam |

### Questions  `/api/questions`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Instructor | Question bank (?search= ?category=) |
| POST | `/` | Instructor | Create question |
| PUT | `/:id` | Instructor | Update question |
| DELETE | `/:id` | Instructor | Delete question |
| POST | `/add-to-exam` | Instructor | Link question to exam |
| POST | `/remove-from-exam` | Instructor | Unlink question from exam |

### Attempts  `/api/attempts`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/start` | Student | Start or resume exam |
| PATCH | `/:id/save-answer` | Student | Auto-save one answer |
| POST | `/:id/submit` | Student | Submit exam + grade |
| GET | `/history` | Student | All past attempts |
| GET | `/:id` | Student | Single attempt result |
| POST | `/:id/cheat-event` | Student | Log violation |
| GET | `/:id/violations` | Instructor/Admin | View cheat log |

---

## Folder Structure

```
backend/
├── config/
│   └── db.js                  ← MongoDB connection
├── middleware/
│   ├── authMiddleware.js       ← protect() and authorize()
│   ├── rateLimiter.js          ← authLimiter (10/15min), apiLimiter
│   └── uploadMiddleware.js     ← Multer config for profile photos
├── models/
│   ├── User.js
│   ├── Exam.js
│   ├── Question.js
│   ├── Attempt.js
│   └── CheatLog.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── examRoutes.js
│   ├── questionRoutes.js
│   └── attemptRoutes.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── examController.js
│   ├── questionController.js
│   └── attemptController.js
├── utils/
│   ├── generateToken.js
│   ├── errorUtils.js
│   └── emailService.js
├── uploads/                   ← profile photos saved here
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

---

## How to Test Profile Photo Upload (Postman)

1. Method: `POST`
2. URL: `http://localhost:5000/api/users/me/photo`
3. Headers: `Authorization: Bearer <your_token>`
4. Body: `form-data` → Key: `photo` (set type to **File**) → Value: select any `.jpg` or `.png`

The server saves the file to `/uploads/` and returns the path.
