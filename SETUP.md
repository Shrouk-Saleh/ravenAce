# 🚀 EduCert Pro — Quick Setup Guide (Phases 1–11)

> **New in this version (Phases 9–11):**
> - **Phase 9** — Instructor "Attempt Detail" page: full question-by-question
>   review of any student's submission, plus a **PDF export** of all results
>   (alongside the existing CSV export).
> - **Phase 10** — Real-time notifications via **Socket.io**. The bell badge,
>   toast popups, and the Notifications page all update instantly when a
>   result is graded, a certificate is issued, or an exam is published —
>   no page refresh needed.
> - **Phase 11** — **Dark mode** toggle (in the sidebar, persisted across
>   sessions) and a fully **responsive mobile layout** with a slide-in
>   sidebar and hamburger menu.

> **Recent fix:** The exam-taking page (`/exam/:attemptId`) was using a
> hardcoded 30-minute timer for every exam because the backend wasn't
> returning the exam's real `duration` field with the attempt. This is
> now fixed — `POST /attempts/start` and `GET /attempts/:id` both
> populate `exam` (title, duration, totalScore, passingScore), and the
> frontend timer now uses `exam.duration` correctly. The new
> **"BUGFIX — Exam Timer & Duration"** folder in the Postman collection
> verifies this end-to-end.

Unzip this folder and run the commands below. That's it.

---

## 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Then open `.env` and fill in your values:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/exam-system
JWT_SECRET=any_long_random_string_here
JWT_EXPIRES_IN=7d
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
NODE_ENV=development
```

> **Gmail App Password**: Google Account → Security → App passwords → generate 16-char password.

```bash
mkdir uploads
npm run dev
```

Backend runs on **http://localhost:5000**

---

## 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## 3. Postman

Import `EduCert-Pro-Postman.json` into Postman:
- Open Postman → **Import** → drop the file
- Run requests **in order** — tokens and IDs save automatically via test scripts

---

## What's inside

| Folder | Purpose |
|--------|---------|
| `backend/` | Node.js + Express + MongoDB API (Phases 1–8) |
| `frontend/` | React + Vite UI (Phases 1–8) |
| `EduCert-Pro-Postman.json` | 60+ test cases for all API endpoints |

---

## All API Endpoints (quick reference)

### Auth `/api/auth`
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/register` | Register (rate-limited) |
| POST | `/login` | Login (rate-limited) |
| POST | `/forgot-password` | Send OTP |
| POST | `/verify-reset-otp` | Verify OTP → get resetToken |
| POST | `/reset-password` | Reset password |

### Users `/api/users`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/me` | Get my profile |
| PUT | `/me` | Update name/email |
| POST | `/me/photo` | Upload profile photo |

### Exams `/api/exams`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List exams (role-filtered) |
| GET | `/:id` | Single exam + questions |
| POST | `/` | Create exam (instructor) |
| PUT | `/:id` | Update exam (instructor) |
| PATCH | `/:id/publish` | Toggle publish |
| DELETE | `/:id` | Delete exam |

### Questions `/api/questions`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Question bank (?search= ?category=) |
| POST | `/` | Create MCQ or True/False question |
| PUT | `/:id` | Update question |
| DELETE | `/:id` | Delete question |
| POST | `/add-to-exam` | Link question to exam |
| POST | `/remove-from-exam` | Unlink question |

### Attempts `/api/attempts`
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/start` | Start or resume exam |
| PATCH | `/:id/save-answer` | Auto-save answer |
| POST | `/:id/submit` | Submit + grade |
| GET | `/history` | My attempt history |
| GET | `/:id` | Single attempt |
| POST | `/:id/cheat-event` | Log violation |
| GET | `/:id/violations` | View cheat log (instructor) |

### Results `/api/results`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/my-history` | All my results |
| GET | `/:attemptId` | Result detail + review |
| GET | `/exam/:examId/attempts` | All students (instructor) |
| GET | `/exam/:examId/export-csv` | Download CSV |
| GET | `/exam/:examId/export-pdf` | Download PDF (Phase 9) |
| GET | `/attempt/:attemptId/detail` | Full attempt detail (instructor) |

### Leaderboard `/api/leaderboard`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/:examId` | Exam leaderboard |
| GET | `/:examId/stats` | Exam analytics (instructor) |
| GET | `/admin/overview` | Platform stats (admin) |

### Certificates `/api/certificates`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/verify/:certId` | **Public** — verify certificate |
| GET | `/mine` | My certificates (student) |
| GET | `/:id` | Single certificate |

### Notifications `/api/notifications`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All notifications |
| PATCH | `/read-all` | Mark all read |
| PATCH | `/:id/read` | Mark one read |
| DELETE | `/:id` | Delete notification |

### Admin `/api/admin`
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/users` | All users |
| PATCH | `/users/:id/role` | Change role |
| PATCH | `/users/:id/toggle-active` | Enable/disable account |
| DELETE | `/users/:id` | Delete user |
| GET | `/exams` | All exams (all instructors) |
| DELETE | `/exams/:id` | Delete any exam |

---

## Phases 9–11 — What's New

### Phase 9 — Instructor & Admin Tools

**Attempt Detail page** (`/instructor/results/:attemptId`)
Click "View" on any row in an exam's results table to see:
- The student's name, email, and photo
- Score, pass/fail, time taken, attempt number
- Every question with the student's answer, the correct answer, and
  (for MCQ) all four options highlighted green/red so you can see
  exactly what they picked vs. what was correct
- A warning banner if the attempt was auto-submitted due to anti-cheat violations

**PDF Export** (`GET /api/results/exam/:examId/export-pdf`)
Click "Export PDF" next to "Export CSV" on the results page. Generates
a formatted PDF with the exam title, instructor, summary stats (pass
rate, average score), and a ranked table of every student's result —
built with `pdfkit`, streamed directly to the browser, no temp files.

---

### Phase 10 — Real-Time Notifications (Socket.io)

**How it works:**
1. The backend creates a single Socket.io server attached to the same
   HTTP server/port as Express (`backend/utils/socket.js`).
2. When the frontend logs in (or restores a session), it connects a
   shared socket and sends `register` with the user's id
   (`frontend/src/api/socket.js` + `AuthContext`).
3. Whenever the backend creates a notification — a result is graded,
   a certificate is issued, or an instructor publishes a new exam —
   it also emits a `notification:new` (or `notification:new-exam`)
   event straight to that user's (or all students') open browser tabs.
4. The sidebar listens for these events: the unread badge increments
   instantly and a toast slides in from the top-right for 5 seconds.
   The Notifications page also prepends new items live if it's open.

**No new setup required** — Socket.io runs on the same port (5000) as
the REST API. Just make sure both `npm install` commands picked up
`socket.io` (backend) and `socket.io-client` (frontend).

---

### Phase 11 — Dark Mode & Responsive Design

**Dark mode**
- Toggle switch at the bottom of the sidebar (above "Log out")
- Implemented via CSS variables + Tailwind's `darkMode: "class"` —
  every existing `bg-surface-*`, `text-on-surface-*`, etc. class
  automatically re-themes when `<html class="dark">` is set
- Preference is saved to `localStorage` and restored on next visit

**Responsive layout**
- On screens narrower than the `md` breakpoint (768px), the sidebar
  becomes an off-canvas drawer
- A 56px top bar appears with a hamburger menu (left), the EduCert Pro
  logo (center), and the notification bell with live badge (right)
- Tapping the hamburger slides the sidebar in from the left with a
  dark overlay; tapping the overlay or the X closes it
- All page content reflows to full width on mobile (the `max-w-2xl`
  containers used throughout naturally center and shrink)

---

## Updated Package List

**Backend** (`backend/package.json`) — added since Phase 8:
- `pdfkit` — PDF generation for results export
- `socket.io` — real-time server

**Frontend** (`frontend/package.json`) — added since Phase 8:
- `socket.io-client` — real-time client

Run `npm install` again in both folders after unzipping to pick these up.
