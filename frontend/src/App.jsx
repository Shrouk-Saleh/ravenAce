import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'

// Auth
import Login          from './pages/Login'
import Register       from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'

// Student — Phases 1-4
import StudentDashboard from './pages/StudentDashboard'
import ExamList         from './pages/ExamList'
import ExamDetail       from './pages/ExamDetail'
import ExamInterface    from './pages/ExamInterface'
import AttemptHistory   from './pages/AttemptHistory'

// Student — Phases 5-8
// Shared & Public
import Profile           from './pages/Profile'
import ActivateAccount   from './pages/ActivateAccount'
import InvitePage        from './pages/InvitePage'
import { Unauthorized, NotFound } from './pages/ErrorPages'

// ── Lazy Loaded Routes (to reduce initial bundle size) ──
const ResultDetail   = React.lazy(() => import('./pages/ResultDetail'))
const Leaderboard    = React.lazy(() => import('./pages/Leaderboard'))
const Certificates   = React.lazy(() => import('./pages/Certificates'))
const Notifications  = React.lazy(() => import('./pages/Notifications'))

const InstructorResults = React.lazy(() => import('./pages/InstructorResults'))
const AttemptDetail     = React.lazy(() => import('./pages/AttemptDetail'))
const ExamStats         = React.lazy(() => import('./pages/ExamStats'))

const InstructorDashboard = React.lazy(() => import('./pages/InstructorDashboard'))
const MyExams             = React.lazy(() => import('./pages/MyExams'))
const CreateExam          = React.lazy(() => import('./pages/CreateExam'))
const EditExam            = React.lazy(() => import('./pages/EditExam'))
const QuestionManager     = React.lazy(() => import('./pages/QuestionManager'))
const QuestionBank        = React.lazy(() => import('./pages/QuestionBank'))

const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'))
const AdminUsers     = React.lazy(() => import('./pages/AdminUsers'))
const AdminExams     = React.lazy(() => import('./pages/AdminExams'))

const OrgDashboard     = React.lazy(() => import('./pages/OrgDashboard'))
const OrgProfile       = React.lazy(() => import('./pages/OrgProfile'))
const OrgInstructors   = React.lazy(() => import('./pages/OrgInstructors'))
const OrgStudents      = React.lazy(() => import('./pages/OrgStudents'))
const OrgSubscription  = React.lazy(() => import('./pages/OrgSubscription'))

const VerifyCertificate = React.lazy(() => import('./pages/VerifyCertificate'))
const Showcase          = React.lazy(() => import('./pages/Showcase'))
const Pricing           = React.lazy(() => import('./pages/Pricing'))

const AiTutor             = React.lazy(() => import('./pages/AiTutor'))
const QuestionGenerator   = React.lazy(() => import('./pages/QuestionGenerator'))
const AiPerformanceReport = React.lazy(() => import('./pages/AiPerformanceReport'))
const CheatAnalysis       = React.lazy(() => import('./pages/CheatAnalysis'))
const PlagiarismReportPage = React.lazy(() => import('./pages/PlagiarismReportPage'))

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
        <Routes>

          {/* ── Public ─────────────────────────────────────── */}
          <Route path="/login"            element={<Login />} />
          <Route path="/register"         element={<Register />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/verify/:certId"   element={<VerifyCertificate />} />
          <Route path="/showcase"         element={<Showcase />} />
          <Route path="/activate"         element={<ActivateAccount />} />
          <Route path="/pricing"          element={<Pricing />} />
          <Route path="/"                 element={<Navigate to="/login" replace />} />

          {/* ── Student ─────────────────────────────────────── */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/exams" element={
            <ProtectedRoute roles={['student']}><ExamList /></ProtectedRoute>
          } />
          <Route path="/exams/:id" element={
            <ProtectedRoute roles={['student']}><ExamDetail /></ProtectedRoute>
          } />
          <Route path="/exam/:attemptId" element={
            <ProtectedRoute roles={['student']}><ExamInterface /></ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute roles={['student']}><AttemptHistory /></ProtectedRoute>
          } />
          <Route path="/results/:attemptId" element={
            <ProtectedRoute roles={['student']}><ResultDetail /></ProtectedRoute>
          } />
          <Route path="/leaderboard/:examId" element={
            <ProtectedRoute roles={['student']}><Leaderboard /></ProtectedRoute>
          } />
          <Route path="/certificates" element={
            <ProtectedRoute roles={['student']}><Certificates /></ProtectedRoute>
          } />
          <Route path="/tutor/:examId" element={
            <ProtectedRoute roles={['student']}><AiTutor /></ProtectedRoute>
          } />
          <Route path="/ai-report/:attemptId" element={
            <ProtectedRoute roles={['student']}><AiPerformanceReport /></ProtectedRoute>
          } />

          {/* ── Instructor ──────────────────────────────────── */}
          <Route path="/instructor" element={
            <ProtectedRoute roles={['instructor']}><InstructorDashboard /></ProtectedRoute>
          } />
          <Route path="/instructor/exams" element={
            <ProtectedRoute roles={['instructor']}><MyExams /></ProtectedRoute>
          } />
          <Route path="/instructor/exams/create" element={
            <ProtectedRoute roles={['instructor']}><CreateExam /></ProtectedRoute>
          } />
          <Route path="/instructor/exams/:id/edit" element={
            <ProtectedRoute roles={['instructor']}><EditExam /></ProtectedRoute>
          } />
          <Route path="/instructor/exams/:examId/questions" element={
            <ProtectedRoute roles={['instructor']}><QuestionManager /></ProtectedRoute>
          } />
          <Route path="/instructor/questions" element={
            <ProtectedRoute roles={['instructor']}><QuestionBank /></ProtectedRoute>
          } />
          <Route path="/instructor/exams/:examId/results" element={
            <ProtectedRoute roles={['instructor']}><InstructorResults /></ProtectedRoute>
          } />
          <Route path="/instructor/results/:attemptId" element={
            <ProtectedRoute roles={['instructor', 'admin']}><AttemptDetail /></ProtectedRoute>
          } />
          <Route path="/instructor/exams/:examId/stats" element={
            <ProtectedRoute roles={['instructor']}><ExamStats /></ProtectedRoute>
          } />
          <Route path="/instructor/generate-questions" element={
            <ProtectedRoute roles={['instructor', 'admin']}><QuestionGenerator /></ProtectedRoute>
          } />
          <Route path="/instructor/cheat-analysis/:attemptId" element={
            <ProtectedRoute roles={['instructor', 'admin']}><CheatAnalysis /></ProtectedRoute>
          } />
          <Route path="/instructor/plagiarism/:examId" element={
            <ProtectedRoute roles={['instructor', 'admin']}><PlagiarismReportPage /></ProtectedRoute>
          } />

          {/* ── Admin ───────────────────────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>
          } />
          <Route path="/admin/exams" element={
            <ProtectedRoute roles={['admin']}><AdminExams /></ProtectedRoute>
          } />

          {/* ── Organization ────────────────────────────────────── */}
          <Route path="/organization" element={
            <ProtectedRoute roles={['organization']}><OrgDashboard /></ProtectedRoute>
          } />
          <Route path="/organization/profile" element={
            <ProtectedRoute roles={['organization']}><OrgProfile /></ProtectedRoute>
          } />
          <Route path="/organization/instructors" element={
            <ProtectedRoute roles={['organization']}><OrgInstructors /></ProtectedRoute>
          } />
          <Route path="/organization/students" element={
            <ProtectedRoute roles={['organization']}><OrgStudents /></ProtectedRoute>
          } />
          <Route path="/organization/subscription" element={
            <ProtectedRoute roles={['organization']}><OrgSubscription /></ProtectedRoute>
          } />

          {/* ── Shared (any logged-in role) ─────────────────── */}
          <Route path="/notifications" element={
            <ProtectedRoute><Notifications /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/invite/:token" element={
            <InvitePage />
          } />

          {/* ── Errors ──────────────────────────────────────── */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*"             element={<NotFound />} />

        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
