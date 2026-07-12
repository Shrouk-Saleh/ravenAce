import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

function ExamDetail() {
  const { id }            = useParams()
  const navigate          = useNavigate()
  const [exam, setExam]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    api.get(`/exams/${id}`)
      .then(res => setExam(res.data.data.exam))
      .catch(() => setError('Exam not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleStart = async () => {
    setStarting(true); setError('')
    try {
      const { data } = await api.post('/attempts/start', { examId: id })
      navigate(`/exam/${data.data.attempt._id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start exam.')
      setStarting(false)
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  if (!exam) return (
    <AppLayout>
      <div className="text-center py-16">
        <p className="text-body-lg text-on-surface-variant">{error || 'Exam not found.'}</p>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary mb-6 transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
        </button>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary-container px-8 py-8">
            <span className="material-symbols-outlined text-on-primary-container text-[40px] mb-3 block">assignment</span>
            <h1 className="text-h1 text-on-primary-container">{exam.title}</h1>
            {exam.category && (
              <span className="inline-block mt-2 px-3 py-1 bg-white/20 text-on-primary-container text-label-sm rounded-full">
                {exam.category}
              </span>
            )}
          </div>

          <div className="p-8 space-y-6">
            {exam.description && (
              <p className="text-body-lg text-on-surface-variant">{exam.description}</p>
            )}

            {/* Rules grid */}
            <div>
              <h2 className="text-h3 text-on-surface mb-4">Exam Rules</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: 'schedule',    label: 'Duration',      value: `${exam.duration} minutes` },
                  { icon: 'star',        label: 'Passing Score', value: `${exam.passingScore} / ${exam.totalScore}` },
                  { icon: 'quiz',        label: 'Questions',     value: `${exam.questions?.length || 0} questions` },
                  { icon: 'repeat',      label: 'Max Attempts',  value: exam.maxAttempts },
                  { icon: 'shuffle',     label: 'Questions',     value: exam.shuffle ? 'Shuffled' : 'Fixed order' },
                  { icon: 'person',      label: 'Instructor',    value: exam.instructor?.name || 'N/A' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-3 p-3 bg-surface-container rounded-lg">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">{r.icon}</span>
                    <div>
                      <p className="text-label-sm text-on-surface-variant">{r.label}</p>
                      <p className="text-label-md text-on-surface">{r.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anti-cheat warning */}
            <div className="p-4 bg-surface-container-high border border-outline-variant rounded-lg flex gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px] mt-0.5">security</span>
              <div>
                <p className="text-label-md text-on-surface font-bold">Anti-cheat is active</p>
                <p className="text-label-sm text-on-surface-variant mt-0.5">
                  Tab switching, exiting fullscreen, and copy/paste are monitored. 3 violations = auto-submit.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error-container flex items-center gap-2">
                <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
                <p className="text-label-md text-on-error-container">{error}</p>
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full bg-primary-container text-on-primary-container text-h3 py-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {starting ? 'Starting...' : 'Start Exam'}
              {!starting && <span className="material-symbols-outlined">play_arrow</span>}
            </button>

            <Link
              to={`/leaderboard/${id}`}
              className="w-full flex items-center justify-center gap-2 py-3 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">leaderboard</span>
              View Leaderboard
            </Link>

            {/* AI Tutor */}
            <Link
              to={`/tutor/${id}`}
              className="w-full flex items-center justify-center gap-2 py-3 border border-primary/30 bg-primary/5 rounded-lg text-label-md text-primary hover:bg-primary/10 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              Study with AI Tutor
              <span className="text-label-sm text-on-surface-variant">(Gemini AI)</span>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default ExamDetail
