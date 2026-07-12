import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import useAntiCheat from '../hooks/useAntiCheat'
import { FaSchool, FaClock, FaArrowLeft, FaArrowRight, FaCheck, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSpinner, FaQuestionCircle, FaSignOutAlt, FaCode, FaPlay } from 'react-icons/fa'

// Statuses that mean the attempt is completely done and the student
// should see the results page rather than the exam interface.
const GRADEABLE_STATUSES = ['submitted', 'timed-out', 'auto-submitted']

function ExamInterface() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({}) // { questionId: answer } — MCQ/TF/Written
  const [codeAnswers, setCodeAnswers] = useState({}) // { questionId: { code, language } }
  const [codeRunResults, setCodeRunResults] = useState({}) // { questionId: result }
  const [runningCode, setRunningCode] = useState({}) // { questionId: bool }
  const [timeLeft, setTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)  // { message, type } for in-page anti-cheat warnings
  const timerRef = useRef(null)

  // Tracks pending debounced save-answer timeouts per question.
  // Must be flushed before the component unmounts on submit/abandon
  // to avoid a 404 race hitting the closed attempt.
  const answerTimeoutRef = useRef({})

  // ── Flush all pending saves ─────────────────────────────────────────
  // Called before submit/abandon so no lingering save fires after the
  // attempt is closed. Returns a promise that resolves once all queued
  // saves have been sent (or skipped if already sent).
  const flushPendingSaves = async () => {
    const qIds = Object.keys(answerTimeoutRef.current)
    const flushPromises = []
    for (const qId of qIds) {
      if (answerTimeoutRef.current[qId]) {
        clearTimeout(answerTimeoutRef.current[qId])
        answerTimeoutRef.current[qId] = null
        // Fire the save immediately for this question
        const payload = { questionId: qId }
        if (answers[qId] !== undefined) payload.answer = answers[qId]

        // Wait, since we update state functionally, answers/codeAnswers might be slightly stale if using closures.
        // But answerTimeoutRef captures the timeout, answers/codeAnswers in flushPendingSaves uses the latest render state.
        if (codeAnswers[qId] !== undefined) {
          payload.codeAnswer = codeAnswers[qId].code
          payload.language = codeAnswers[qId].language
        }

        if (payload.answer !== undefined || payload.codeAnswer !== undefined) {
          flushPromises.push(
            api.patch(`/attempts/${attemptId}/save-answer`, payload)
              .catch(err => console.warn('Flush save failed:', err.message))
          )
        }
      }
    }
    answerTimeoutRef.current = {}
    if (flushPromises.length > 0) await Promise.all(flushPromises)
  }

  // ── Load the attempt once on mount ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await api.get(`/attempts/${attemptId}`)
        const att = res.data.data.attempt

        if (cancelled) return

        // If the attempt is finished (graded) → go to results
        if (GRADEABLE_STATUSES.includes(att.status)) {
          navigate(`/results/${attemptId}`, { replace: true })
          return
        }

        // If the attempt was abandoned → go to dashboard, don't loop back here
        if (att.status === 'abandoned') {
          navigate('/dashboard', { replace: true })
          return
        }

        // att is in-progress — resume it by calling /attempts/start with the
        // exam id. The backend detects the existing in-progress attempt and
        // returns it with populated questions and exam object.
        const startRes = await api.post('/attempts/start', {
          examId: att.exam?._id || att.exam,
        })
        const fullAttempt = startRes.data.data.attempt

        if (cancelled) return

        setAttempt(fullAttempt)
        setQuestions((fullAttempt.questions || []).filter(Boolean))

        // Restore any answers already saved (e.g. after a page refresh)
        const restored = {}
          ; (fullAttempt.savedAnswers || []).forEach(a => {
            const qId = a.question?._id || a.question
            if (qId) restored[String(qId)] = a.answer
          })
        setAnswers(restored)

        // Restore code answers
        const restoredCode = {}
          ; (fullAttempt.savedAnswers || []).forEach(a => {
            const qId = a.question?._id || a.question
            if (qId && a.codeAnswer) {
              restoredCode[String(qId)] = { code: a.codeAnswer, language: a.language || 'python' }
            }
          })
        setCodeAnswers(restoredCode)

        // Duration comes from the populated exam object.
        const durationMinutes = fullAttempt.exam?.duration ?? 30
        const elapsedSeconds = (Date.now() - new Date(fullAttempt.startedAt)) / 1000
        const totalSeconds = durationMinutes * 60
        setTimeLeft(Math.max(0, Math.floor(totalSeconds - elapsedSeconds)))
      } catch (err) {
        console.error('Failed to load exam:', err)
        setError(err.response?.data?.message || 'Could not load this exam.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [attemptId, navigate])

  // ── Submit handler ──────────────────────────────────────────────────
  // Uses a ref so the setInterval timer closure always calls the
  // latest version (avoids stale `submitting` / `attemptId` captures).
  const submitRef = useRef(null)
  submitRef.current = async (timedOut = false) => {
    if (submitting) return
    setSubmitting(true)
    clearInterval(timerRef.current)

    // Flush any pending debounced saves BEFORE submitting, so the
    // backend grades the most recently selected answers, not stale ones.
    await flushPendingSaves()

    try {
      await api.post(`/attempts/${attemptId}/submit`, { timedOut })
      navigate(`/results/${attemptId}`)
    } catch (err) {
      console.error('Submit failed:', err)
      setSubmitting(false)
    }
  }

  // ── Countdown timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null) return

    if (timeLeft <= 0) {
      submitRef.current(true)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          submitRef.current(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === null])

  // ── Unmount cleanup ─────────────────────────────────────────────────
  // Cancel all pending debounced saves when the component unmounts
  // (e.g. the student navigates away without submitting). Without this,
  // saves would fire after the attempt is already closed and return 404s.
  useEffect(() => {
    return () => {
      Object.values(answerTimeoutRef.current).forEach(t => clearTimeout(t))
      answerTimeoutRef.current = {}
    }
  }, [])

  // ── Anti-cheat ──────────────────────────────────────────────────────
  // Pass setToast so the hook can show in-page warnings instead of
  // blocking window.alert() calls that cause double-detection.
  useAntiCheat(
    attempt?._id,
    (id) => navigate(`/results/${id}`),
    setToast
  )

  // ── Answer selection (debounced auto-save) ──────────────────────────
  const selectAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))

    if (answerTimeoutRef.current[questionId]) {
      clearTimeout(answerTimeoutRef.current[questionId])
    }

    answerTimeoutRef.current[questionId] = setTimeout(async () => {
      answerTimeoutRef.current[questionId] = null
      try {
        await api.patch(`/attempts/${attemptId}/save-answer`, { questionId, answer })
      } catch (err) {
        console.error('Save answer failed:', err.message)
      }
    }, 500)
  }

  // ── Code selection (debounced auto-save) ────────────────────────────
  const updateCodeAnswer = (questionId, field, value, allowedLangs = []) => {
    setCodeAnswers(prev => {
      const current = prev[questionId] || { code: '', language: allowedLangs[0] || 'python' }
      const updated = { ...current, [field]: value }

      if (answerTimeoutRef.current[questionId]) {
        clearTimeout(answerTimeoutRef.current[questionId])
      }

      answerTimeoutRef.current[questionId] = setTimeout(async () => {
        answerTimeoutRef.current[questionId] = null
        try {
          await api.patch(`/attempts/${attemptId}/save-answer`, {
            questionId,
            codeAnswer: updated.code,
            language: updated.language
          })
        } catch (err) {
          console.error('Save code answer failed:', err.message)
        }
      }, 1000)

      return { ...prev, [questionId]: updated }
    })
  }

  // ── Run Code Sandbox ────────────────────────────────────────────────
  const runCodeSandbox = async (questionId) => {
    const q = questions.find(x => x._id === questionId)
    if (!q) return
    const ca = codeAnswers[questionId] || { code: q.codeTemplate || '', language: q.allowedLanguages?.[0] || 'python' }

    setRunningCode(prev => ({ ...prev, [questionId]: true }))
    try {
      const publicTc = q.testCases?.find(tc => !tc.isHidden)
      const input = publicTc ? publicTc.input : ''

      const res = await api.post('/ai/run-code', {
        sourceCode: ca.code,
        language: ca.language,
        stdin: input,   // backend reads 'stdin', not 'input'
        timeLimit: q.timeLimit || 5,
        memoryLimit: q.memoryLimit || 128
      })
      setCodeRunResults(prev => ({ ...prev, [questionId]: res.data.data }))
    } catch (err) {
      console.error('Run code error:', err)
      setCodeRunResults(prev => ({
        ...prev,
        [questionId]: { error: err.response?.data?.message || 'Execution failed' }
      }))
    } finally {
      setRunningCode(prev => ({ ...prev, [questionId]: false }))
    }
  }

  // ── Abandon Attempt ──────────────────────────────────────────────────
  // Marks the attempt as abandoned on the backend (no grading, no score).
  // The student is then sent to their dashboard without a result.
  const abandonExam = async () => {
    if (!window.confirm(
      'Are you sure you want to abandon this exam?\n\n' +
      'You will not receive a score. This attempt will be marked as abandoned ' +
      'and will NOT count against your remaining attempts.'
    )) return

    // Cancel any pending saves — no point saving answers for an abandoned attempt
    Object.values(answerTimeoutRef.current).forEach(t => clearTimeout(t))
    answerTimeoutRef.current = {}
    clearInterval(timerRef.current)

    try {
      await api.post(`/attempts/${attemptId}/abandon`)
      // Always send student to their dashboard — they have no role other
      // than student on this page (only students can take exams).
      navigate('/dashboard')
    } catch (err) {
      console.error('Abandon failed:', err)
      setError(err.response?.data?.message || 'Failed to abandon attempt. Please try again.')
    }
  }

  // ── Loading / error / empty states ─────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="text-primary animate-spin text-[48px] block mx-auto mb-4" />
          <p className="text-body-lg text-on-surface-variant">Loading exam...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <FaExclamationTriangle className="text-error text-[48px] block mx-auto mb-4" />
          <p className="text-body-lg text-on-surface mb-2">Something went wrong</p>
          <p className="text-label-md text-on-surface-variant mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <FaQuestionCircle className="text-outline text-[48px] block mx-auto mb-4" />
          <p className="text-body-lg text-on-surface-variant mb-6">This exam has no questions yet.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const safeTimeLeft = timeLeft ?? 0
  const mins = String(Math.floor(safeTimeLeft / 60)).padStart(2, '0')
  const secs = String(safeTimeLeft % 60).padStart(2, '0')
  const timeUrgent = timeLeft !== null && timeLeft < 120
  const answeredCount = Object.values(answers).filter(a => a).length +
    Object.values(codeAnswers).filter(ca => ca?.code?.trim()).length
  const isLastQuestion = current === questions.length - 1

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest border-b border-outline-variant px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaSchool className="text-primary text-[24px]" />
          <div>
            <p className="text-label-md text-on-surface font-bold">{attempt?.exam?.title || 'Exam'}</p>
            <p className="text-label-sm text-on-surface-variant">{answeredCount}/{questions.length} answered</p>
          </div>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-h2
          ${timeUrgent ? 'bg-error-container text-on-error-container animate-pulse' : 'bg-surface-container text-on-surface'}`}>
          <FaClock className="text-[18px]" />
          {mins}:{secs}
        </div>

        <div className="flex gap-3">
          <button
            onClick={abandonExam}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-error text-on-error text-label-md rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
          >
            <FaSignOutAlt /> Abandon
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="px-4 py-2 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-20 pb-32 px-4 flex-1 flex justify-center">
        <div className="w-full max-w-2xl">

          {/* Progress bar */}
          <div className="h-1 bg-surface-container rounded-full mb-8">
            <div
              className="h-1 bg-primary-container rounded-full transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-surface-container text-label-sm text-on-surface-variant rounded-full">
                Question {current + 1} of {questions.length}
              </span>
              <span className="px-3 py-1 bg-surface-container text-label-sm text-on-surface-variant rounded-full capitalize">
                {q.type === 'truefalse' ? 'True / False'
                  : q.type === 'written' ? 'Written Answer'
                    : q.type === 'coding' ? 'Coding'
                      : 'Multiple Choice'}
              </span>
            </div>

            <p className="text-h2 text-on-surface mb-8 leading-relaxed">{q.text}</p>

            {/* MCQ options */}
            {q.type === 'mcq' && (
              <div className="space-y-3">
                {q.options?.map((opt, i) => {
                  const selected = answers[q._id] === opt
                  return (
                    <button
                      key={i}
                      onClick={() => selectAnswer(q._id, opt)}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all flex items-center gap-3
                        ${selected
                          ? 'border-primary bg-surface-container text-on-surface'
                          : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/40 hover:bg-surface-container-low'
                        }`}
                    >
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${selected ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                        {selected && <span className="w-2.5 h-2.5 rounded-full bg-white block" />}
                      </span>
                      <span className="text-body-lg">{opt}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* True/False options */}
            {q.type === 'truefalse' && (
              <div className="grid grid-cols-2 gap-4">
                {['True', 'False'].map((opt) => {
                  const selected = answers[q._id] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(q._id, opt)}
                      className={`py-6 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                        ${selected
                          ? 'border-primary bg-surface-container text-primary'
                          : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/40 hover:bg-surface-container-low'
                        }`}
                    >
                      {opt === 'True'
                        ? <FaCheckCircle className="text-[32px]" />
                        : <FaTimesCircle className="text-[32px]" />}
                      <span className="text-h3">{opt}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Written answer */}
            {q.type === 'written' && (
              <div className="space-y-2">
                <p className="text-label-sm text-on-surface-variant">Write your answer below. Be thorough — your answer will be AI-graded.</p>
                <textarea
                  value={answers[q._id] || ''}
                  onChange={e => selectAnswer(q._id, e.target.value)}
                  rows={8}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 bg-surface-container-lowest border-2 border-outline-variant rounded-xl text-body-lg text-on-surface focus:border-primary focus:outline-none input-halo transition-all resize-y"
                />
                <div className="flex items-center justify-between">
                  <p className="text-label-sm text-on-surface-variant">{(answers[q._id] || '').length} characters</p>
                  <span className="inline-flex items-center gap-1 text-label-sm text-primary">
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span> AI-graded after submission
                  </span>
                </div>
              </div>
            )}

            {/* Coding answer */}
            {q.type === 'coding' && (() => {
              const ca = codeAnswers[q._id] || { code: q.codeTemplate || '', language: q.allowedLanguages?.[0] || 'python' }
              const runResult = codeRunResults[q._id]
              const isRunning = runningCode[q._id]
              return (
                <div className="space-y-3">
                  {/* Language selector */}
                  <div className="flex items-center gap-3">
                    <label className="text-label-sm text-outline">Language:</label>
                    <div className="flex gap-2">
                      {(q.allowedLanguages || ['python']).map(lang => (
                        <button
                          key={lang}
                          onClick={() => updateCodeAnswer(q._id, 'language', lang, q.allowedLanguages)}
                          className={`px-3 py-1.5 rounded-lg text-label-sm font-medium transition-all border ${ca.language === lang
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-surface-container text-on-surface border-outline-variant hover:border-primary/40'
                            }`}
                        >
                          {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : 'Python'}
                        </button>
                      ))}
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 text-label-sm text-primary">
                      <span className="material-symbols-outlined text-[14px]">smart_toy</span> Gemini AI graded
                    </span>
                  </div>

                  {/* Code editor */}
                  <div className="relative">
                    <textarea
                      value={ca.code}
                      onChange={e => updateCodeAnswer(q._id, 'code', e.target.value, q.allowedLanguages)}
                      rows={14}
                      spellCheck={false}
                      placeholder={`// Write your ${ca.language} code here...`}
                      className="w-full px-4 py-3 bg-[#1e1e2e] border-2 border-outline-variant rounded-xl text-body-md text-green-300 focus:border-primary focus:outline-none transition-all resize-y font-mono leading-relaxed"
                    />
                  </div>

                  {/* Run button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => runCodeSandbox(q._id)}
                      disabled={isRunning || !ca.code?.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-highest transition-all disabled:opacity-50"
                    >
                      {isRunning
                        ? <><FaSpinner className="animate-spin" /> Running...</>
                        : <><FaPlay className="text-green-500" /> Run Code</>}
                    </button>
                    <p className="text-label-sm text-on-surface-variant">Test with sample input (sandbox — no test cases)</p>
                  </div>

                  {/* Run output */}
                  {runResult && (
                    <div className={`rounded-xl border-2 overflow-hidden ${runResult.error ? 'border-error' :
                        runResult.accepted ? 'border-green-500' : 'border-yellow-500'
                      }`}>
                      <div className={`px-3 py-1.5 text-label-sm font-medium ${runResult.error ? 'bg-error-container text-on-error-container' :
                          runResult.accepted ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                        {runResult.error ? '✗ Error' :
                          runResult.accepted ? '✓ Accepted' : `✗ ${runResult.statusDescription}`}
                        {runResult.time && <span className="ml-2 opacity-70">{runResult.time}s</span>}
                      </div>
                      <pre className="px-4 py-3 text-body-md font-mono bg-[#1e1e2e] text-green-300 overflow-x-auto max-h-40 text-sm">
                        {runResult.error || runResult.stdout || runResult.stderr || runResult.compileOutput || '(no output)'}
                      </pre>
                    </div>
                  )}

                  {/* Public test cases */}
                  {q.testCases?.filter(tc => !tc.isHidden).length > 0 && (
                    <details>
                      <summary className="text-label-sm text-primary cursor-pointer hover:opacity-80">
                        View {q.testCases.filter(tc => !tc.isHidden).length} public test case(s)
                      </summary>
                      <div className="mt-2 space-y-2">
                        {q.testCases.filter(tc => !tc.isHidden).map((tc, ti) => (
                          <div key={ti} className="bg-surface-container rounded-lg p-3 font-mono text-label-sm">
                            <p className="text-on-surface-variant">Input: <span className="text-on-surface">{tc.input || '(none)'}</span></p>
                            <p className="text-on-surface-variant">Expected: <span className="text-primary">{tc.expectedOutput}</span></p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest border-t border-outline-variant px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => setCurrent(c => c - 1)}
            disabled={current === 0}
            className="flex items-center gap-1 px-4 py-2.5 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaArrowLeft className="text-[18px]" /> Previous
          </button>

          {/* Question number pills */}
          <div className="flex-1 flex gap-1.5 overflow-x-auto">
            {questions.map((qq, i) => (
              <button
                key={qq._id}
                onClick={() => setCurrent(i)}
                className={`flex-shrink-0 w-8 h-8 rounded-full text-label-sm font-bold transition-all
                  ${i === current
                    ? 'bg-primary-container text-on-primary-container'
                    : (answers[qq._id] || codeAnswers[qq._id]?.code?.trim())
                      ? 'bg-surface-container-high text-on-surface border border-primary/30'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {isLastQuestion ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1 px-5 py-2.5 bg-primary-container text-on-primary-container rounded-lg text-label-md hover:opacity-90 transition-all"
            >
              Finish <FaCheck className="text-[18px]" />
            </button>
          ) : (
            <button
              onClick={() => setCurrent(c => c + 1)}
              className="flex items-center gap-1 px-4 py-2.5 bg-surface-container border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-high transition-all"
            >
              Next <FaArrowRight className="text-[18px]" />
            </button>
          )}
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 max-w-sm w-full shadow-xl">
            <FaQuestionCircle className="text-primary text-[40px] mb-4 block mx-auto" />
            <h2 className="text-h2 text-on-surface mb-2 text-center">Submit exam?</h2>
            <p className="text-body-md text-on-surface-variant mb-1">
              Answered: <strong>{answeredCount}</strong> / {questions.length}
            </p>
            {answeredCount < questions.length && (
              <p className="text-label-sm text-on-surface-variant mb-4">
                {questions.length - answeredCount} question(s) left unanswered will be marked wrong.
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowConfirm(false); submitRef.current(false) }}
                disabled={submitting}
                className="flex-1 py-3 bg-primary-container text-on-primary-container rounded-lg text-label-md hover:opacity-90 transition-all disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* In-page Anti-cheat Toast — replaces blocking window.alert() */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-label-md font-medium animate-in fade-in slide-in-from-top-4 flex items-center gap-3
          ${toast.type === 'error' ? 'bg-error text-on-error' : 'bg-tertiary-container text-on-tertiary-container'}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  )
}

export default ExamInterface
