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

  // Secure session state
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [sessionToken, setSessionToken] = useState(null)
  const [attemptId, setAttemptId] = useState(null)

  useEffect(() => {
    api.get(`/exams/${id}`)
      .then(res => setExam(res.data.data.exam))
      .catch(() => setError('Exam not found.'))
      .finally(() => setLoading(false))
  }, [id])

  // Poll for launch status
  useEffect(() => {
    let interval;
    if (showLaunchModal && attemptId) {
      interval = setInterval(async () => {
        try {
          const { data } = await api.get(`/secure-session/launch-status/${attemptId}`);
          if (data.data.status === "LAUNCHED_SUCCESSFULLY") {
            // Electron has taken over. We can close this page or show a success message.
            clearInterval(interval);
            navigate('/dashboard'); // Go back to dashboard on the web since Electron is running the exam
          }
        } catch (err) {
          // Ignore polling errors
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [showLaunchModal, attemptId, navigate]);

  const handleStart = async () => {
    setStarting(true); setError('')
    try {
      // 1. Create Attempt (Standard)
      const { data: attemptData } = await api.post('/attempts/start', { examId: id })
      const currentAttemptId = attemptData.data.attempt._id;
      
      // 2. Create Secure Session Token
      const { data: secureData } = await api.post('/secure-session/create', { attemptId: currentAttemptId })
      const token = secureData.data.token;

      setSessionToken(token);
      setAttemptId(currentAttemptId);
      setShowLaunchModal(true);

      console.log('\n\n--- MANUAL LAUNCH COMMAND ---');
      console.log(`npm start -- "ravenace://start?token=${token}"`);
      console.log('-----------------------------\n\n');

      // 3. Launch deep link
      window.location.href = `ravenace://start?token=${token}`;

    } catch (err) {
      setError(err.response?.data?.message || 'Could not start exam.')
    } finally {
      setStarting(false)
    }
  }

  const handleWebFallback = () => {
    if (attemptId) {
      navigate(`/exam/${attemptId}`);
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
                <p className="text-label-md text-on-surface font-bold">Secure Exam Environment</p>
                <p className="text-label-sm text-on-surface-variant mt-0.5">
                  This exam requires the RavenACE Secure Engine. If you don't have it installed, you can use the web fallback (with standard anti-cheat).
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
              disabled={starting || showLaunchModal}
              className="w-full bg-primary-container text-on-primary-container text-h3 py-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {starting ? 'Preparing Session...' : (showLaunchModal ? 'Launching Desktop App...' : 'Start Secure Exam')}
              {!starting && !showLaunchModal && <span className="material-symbols-outlined">launch</span>}
            </button>

            {/* Launch Modal / Status */}
            {showLaunchModal && (
              <div className="mt-4 p-6 border-2 border-primary/30 bg-primary/5 rounded-xl text-center animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-center mb-4">
                  <span className="material-symbols-outlined text-primary text-[48px] animate-pulse">shield_lock</span>
                </div>
                <h3 className="text-h3 text-on-surface mb-2">Opening Secure Engine...</h3>
                <p className="text-body-md text-on-surface-variant mb-6">
                  Please confirm the prompt to open the RavenACE desktop app.
                </p>
                
                <div className="pt-4 border-t border-outline-variant mt-4">
                  <p className="text-label-sm text-on-surface-variant mb-3">Don't have the secure engine installed?</p>
                  
                  <a 
                    href="https://github.com/Shrouk-Saleh/ravenAce/releases/download/v1.0.0/RavenACE.Secure.Engine.Setup.1.0.0.exe"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-surface-container-highest text-on-surface rounded hover:bg-surface-container-high transition-colors text-sm font-medium w-full"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download for Windows
                  </a>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Link
                to={`/leaderboard/${id}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">leaderboard</span>
                Leaderboard
              </Link>
              
              <Link
                to={`/tutor/${id}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-primary/30 bg-primary/5 rounded-lg text-label-md text-primary hover:bg-primary/10 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">psychology</span>
                AI Tutor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default ExamDetail
