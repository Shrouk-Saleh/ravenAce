import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'
import { FaHandSparkles } from 'react-icons/fa'

function StudentDashboard() {
  const { user }            = useAuth()
  const [exams, setExams]   = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [examsRes, historyRes] = await Promise.all([
          api.get('/exams'),
          api.get('/attempts/history'),
        ])
        setExams(examsRes.data.data.exams)
        setHistory(historyRes.data.data.attempts)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const passed  = history.filter(a => a.passed).length
  const taken   = history.filter(a => a.status !== 'in-progress').length

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-h1 text-on-surface">Welcome back, {user?.name?.split(' ')[0]} <FaHandSparkles className="inline text-yellow-500 mb-1" /></h1>
        <p className="text-body-md text-on-surface-variant mt-1">Here's your learning overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Exams Available', value: exams.length, icon: 'assignment', color: 'text-primary' },
          { label: 'Exams Taken',     value: taken,        icon: 'task_alt',   color: 'text-secondary' },
          { label: 'Passed',          value: passed,       icon: 'workspace_premium', color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center">
              <span className={`material-symbols-outlined ${s.color} text-[24px]`}>{s.icon}</span>
            </div>
            <div>
              <p className="text-display-sm text-on-surface font-bold">{s.value}</p>
              <p className="text-label-md text-on-surface-variant">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Available exams */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-h2 text-on-surface">Available Exams</h2>
          <Link to="/exams" className="text-label-md text-primary hover:underline">View all</Link>
        </div>
        {exams.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="material-symbols-outlined text-outline text-[40px] mb-2 block">assignment_late</span>
            <p className="text-body-md text-on-surface-variant">No exams published yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {exams.slice(0, 5).map((exam) => (
              <div key={exam._id} className="flex items-center justify-between px-6 py-4 hover:bg-surface-container-low transition-all">
                <div>
                  <p className="text-label-md text-on-surface font-bold">{exam.title}</p>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">
                    {exam.duration} min · Pass: {exam.passingScore}/{exam.totalScore} · {exam.category}
                  </p>
                </div>
                <Link
                  to={`/exams/${exam._id}`}
                  className="flex items-center gap-1 px-4 py-2 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all"
                >
                  Start <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div className="mt-6 bg-surface-container-lowest border border-outline-variant rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
            <h2 className="text-h2 text-on-surface">Recent Results</h2>
            <Link to="/history" className="text-label-md text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-outline-variant">
            {history.slice(0, 4).map((attempt) => (
              <div key={attempt._id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-label-md text-on-surface font-bold">{attempt.exam?.title}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    Score: {attempt.score}/{attempt.exam?.totalScore} · Attempt #{attempt.attemptNumber}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-label-sm font-bold
                  ${attempt.passed ? 'bg-green-100 text-green-700' : 'bg-error-container text-on-error-container'}`}>
                  {attempt.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default StudentDashboard
