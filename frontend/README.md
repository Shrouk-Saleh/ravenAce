# Online Exam & Certification System — Frontend

React + Vite frontend for Phases 1–4. Styled to match the EduCert Pro design system (Tailwind CSS + Material Symbols).

---

## Setup

### 1. Make sure the backend is running
```
cd ../backend
npm run dev        # must be on http://localhost:5000
```

### 2. Install and run the frontend
```bash
npm install
npm run dev        # opens at http://localhost:5173
```

---

## Pages Included

### Phase 1 — Auth
| Page | Route | Who |
|------|-------|-----|
| Login | `/login` | Public |
| Register | `/register` | Public |
| Forgot Password (3-step OTP) | `/forgot-password` | Public |

### Phase 1 — Profile
| Page | Route | Who |
|------|-------|-----|
| My Profile + Photo Upload | `/profile` | Any logged-in user |

### Phase 2 — Exam Management (Instructor)
| Page | Route |
|------|-------|
| Instructor Dashboard | `/instructor` |
| My Exams list | `/instructor/exams` |
| Create Exam | `/instructor/exams/create` |
| Edit Exam | `/instructor/exams/:id/edit` |
| Question Manager (per exam) | `/instructor/exams/:examId/questions` |
| Question Bank | `/instructor/questions` |

### Phase 3 — Exam Engine (Student)
| Page | Route |
|------|-------|
| Student Dashboard | `/dashboard` |
| Browse Exams | `/exams` |
| Exam Detail (rules + start) | `/exams/:id` |
| Live Exam Interface | `/exam/:attemptId` |
| Exam Result + Review | `/results/:attemptId` |
| Attempt History | `/history` |

### Phase 4 — Anti-Cheat
Built into the live exam page via `useAntiCheat` hook.
Monitors: tab switches, fullscreen exits, copy, paste, right-click.
3 violations → auto-submit (handled server-side).

---

## Folder Structure
```
src/
├── api/
│   └── axios.js          ← pre-configured Axios with token interceptor
├── context/
│   └── AuthContext.jsx   ← global auth state, persisted to localStorage
├── hooks/
│   └── useAntiCheat.js   ← registers all cheat detection event listeners
├── components/
│   ├── ProtectedRoute.jsx
│   ├── Sidebar.jsx        ← role-based navigation
│   └── AppLayout.jsx      ← sidebar + main content wrapper
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── ForgotPassword.jsx  ← 3-step: email → OTP → new password
│   ├── StudentDashboard.jsx
│   ├── ExamList.jsx
│   ├── ExamDetail.jsx
│   ├── ExamInterface.jsx   ← live exam with timer + anti-cheat
│   ├── ExamResult.jsx
│   ├── AttemptHistory.jsx
│   ├── InstructorDashboard.jsx
│   ├── MyExams.jsx
│   ├── CreateExam.jsx
│   ├── EditExam.jsx
│   ├── QuestionManager.jsx ← add MCQ/TF questions, pick from bank
│   ├── QuestionBank.jsx
│   ├── Profile.jsx         ← update name/email + upload photo
│   └── ErrorPages.jsx      ← 404 + 403 Unauthorized
└── App.jsx                 ← all routes defined here
```

---

## How Role Routing Works

After login the API returns `data.data.user.role`.
- `student`    → redirected to `/dashboard`
- `instructor` → redirected to `/instructor`
- `admin`      → redirected to `/admin` (backend only in phases 1–4)

`ProtectedRoute` in `App.jsx` blocks unauthorised access:
```jsx
<Route path="/instructor" element={
  <ProtectedRoute roles={['instructor']}>
    <InstructorDashboard />
  </ProtectedRoute>
} />
```

---

## Design System
- Font: Inter (Google Fonts)
- Icons: Material Symbols Outlined
- Colors: EduCert Pro palette (primary #004ac6, surface #f8f9ff, etc.)
- Tailwind via CDN — no build step for CSS, just works
