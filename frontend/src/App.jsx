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
import ResultDetail   from './pages/ResultDetail'
import Leaderboard    from './pages/Leaderboard'
import Certificates   from './pages/Certificates'
import Notifications  from './pages/Notifications'

// Instructor — Phases 1-4
import InstructorDashboard from './pages/InstructorDashboard'
import MyExams             from './pages/MyExams'
import CreateExam          from './pages/CreateExam'
import EditExam            from './pages/EditExam'
import QuestionManager     from './pages/QuestionManager'
import QuestionBank        from './pages/QuestionBank'

// Instructor — Phases 5-8
import InstructorResults from './pages/InstructorResults'
import AttemptDetail     from './pages/AttemptDetail'
import ExamStats         from './pages/ExamStats'

// Admin — Phase 8
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers     from './pages/AdminUsers'
import AdminExams     from './pages/AdminExams'

// Organization — Phases 1-8
import OrgDashboard     from './pages/OrgDashboard'
import OrgProfile       from './pages/OrgProfile'
import OrgInstructors   from './pages/OrgInstructors'
import OrgStudents      from './pages/OrgStudents'
import OrgSubscription  from './pages/OrgSubscription'

// Shared & Public
import Profile           from './pages/Profile'
import VerifyCertificate from './pages/VerifyCertificate'
import Showcase          from './pages/Showcase'
import ActivateAccount   from './pages/ActivateAccount'
import Pricing           from './pages/Pricing'
import { Unauthorized, NotFound } from './pages/ErrorPages'

// AI Features
import AiTutor             from './pages/AiTutor'
import QuestionGenerator   from './pages/QuestionGenerator'
import AiPerformanceReport from './pages/AiPerformanceReport'
import CheatAnalysis       from './pages/CheatAnalysis'
import PlagiarismReportPage from './pages/PlagiarismReportPage'

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
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

          {/* ── Errors ──────────────────────────────────────── */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*"             element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
