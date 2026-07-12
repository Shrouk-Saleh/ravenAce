import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'
import { IMAGE_BASE_URL } from '../utils/constants'
import { FaCheck, FaTimes } from 'react-icons/fa'

// Phase 9 — Instructor & Admin Tools
// Shows one student's complete attempt: their info, score, time,
// and a full question-by-question breakdown (same visual language
// as the student's own ResultDetail page, but with the student's
// identity shown at the top since the instructor is viewing it).
function AttemptDetail() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(null)
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editingGrade, setEditingGrade] = useState(null)
  const [gradeForm, setGradeForm] = useState({ score: 0, isCorrect: false, feedback: '' })
  const [savingGrade, setSavingGrade] = useState(false)

  const handleEditClick = (result) => {
    if (!result.question) return
    setEditingGrade(result.question._id)
    setGradeForm({
      score: result.score || 0,
      isCorrect: result.isCorrect || false,
      feedback: result.feedback || ''
    })
  }

  const handleGradeSubmit = async (e, result) => {
    e.preventDefault()
    setSavingGrade(true)
    try {
      const { data } = await api.put(`/results/attempt/${attemptId}/grade/${result.question._id}`, gradeForm)
      
      setAttempt(prev => {
        const updated = { ...prev }
        updated.score = data.data.score
        updated.passed = data.data.passed
        const qIndex = updated.perQuestionResult.findIndex(r => r.question?._id === result.question._id)
        if (qIndex !== -1) {
          // Merge updated result over the old one, but keep the populated question object
          const oldQuestion = updated.perQuestionResult[qIndex].question
          updated.perQuestionResult[qIndex] = { 
            ...updated.perQuestionResult[qIndex], 
            ...data.data.questionResult,
            question: oldQuestion
          }
        }
        return updated
      })
      
      setEditingGrade(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update grade.')
    } finally {
      setSavingGrade(false)
    }
  }

  useEffect(() => {
    Promise.all([
      api.get(`/results/attempt/${attemptId}/detail`),
      api.get(`/attempts/${attemptId}/violations`).catch(() => ({ data: { data: { violations: [] } } }))
    ])
      .then(([resAttempt, resViolations]) => {
        setAttempt(resAttempt.data.data.attempt)
        setViolations(resViolations.data.data.violations || [])
      })
      .catch(err => setError(err.response?.data?.message || 'Could not load attempt.'))
      .finally(() => setLoading(false))
  }, [attemptId])

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  if (error || !attempt) return (
    <AppLayout>
      <p className="text-center py-16 text-on-surface-variant">{error || 'Attempt not found.'}</p>
    </AppLayout>
  )

  const pct = attempt.exam?.totalScore
    ? Math.round((attempt.score / attempt.exam.totalScore) * 100)
    : 0
  const correct = attempt.perQuestionResult?.filter(r => r.isCorrect).length || 0
  const wrong = attempt.perQuestionResult?.filter(r => !r.isCorrect && r.studentAnswer).length || 0
  const skipped = attempt.perQuestionResult?.filter(r => !r.studentAnswer).length || 0
  const mins = Math.floor((attempt.timeTaken || 0) / 60)
  const secs = (attempt.timeTaken || 0) % 60

  const statusLabel = {
    submitted: 'Submitted',
    'timed-out': 'Timed Out',
    'auto-submitted': 'Auto-Submitted (Violations)',
  }[attempt.status] || attempt.status

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary mb-6 transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Results
        </button>

        {/* Student info card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center overflow-hidden flex-shrink-0">
            {attempt.student?.profilePhoto
              ? <img src={attempt.student.profilePhoto.startsWith('http') ? attempt.student.profilePhoto : `${IMAGE_BASE_URL}${attempt.student.profilePhoto}`} className="w-14 h-14 object-cover" alt="" />
              : <span className="material-symbols-outlined text-on-primary-container text-[26px]">person</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-h3 text-on-surface">{attempt.student?.name}</p>
            <p className="text-label-md text-on-surface-variant">{attempt.student?.email}</p>
          </div>
          <div className="text-right">
            <p className="text-label-sm text-on-surface-variant">Attempt #{attempt.attemptNumber}</p>
            <p className="text-label-sm text-on-surface-variant">{statusLabel}</p>
          </div>
        </div>

        {/* Score hero */}
        <div className={`rounded-xl p-8 mb-6 text-center ${attempt.passed ? 'bg-primary-container' : 'bg-error-container'}`}>
          <span className="material-symbols-outlined text-[56px] mb-2 block"
            style={{ color: attempt.passed ? '#eeefff' : '#93000a' }}>
            {attempt.passed ? 'workspace_premium' : 'assignment_late'}
          </span>
          <h1 className={`text-display-sm mb-1 ${attempt.passed ? 'text-on-primary-container' : 'text-on-error-container'}`}>
            {attempt.passed ? 'Passed' : 'Did Not Pass'}
          </h1>
          <p className={`text-body-md mb-4 ${attempt.passed ? 'text-on-primary-container/80' : 'text-on-error-container/80'}`}>
            {attempt.exam?.title}
          </p>
          <div className={`inline-flex items-baseline gap-1 text-[64px] font-bold leading-none
            ${attempt.passed ? 'text-on-primary-container' : 'text-on-error-container'}`}>
            {attempt.score}
            <span className="text-h2">/{attempt.exam?.totalScore}</span>
          </div>
          <p className={`text-label-md mt-2 ${attempt.passed ? 'text-on-primary-container/70' : 'text-on-error-container/70'}`}>
            {pct}% · Pass mark: {attempt.exam?.passingScore}
          </p>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: 'check_circle', label: 'Correct', value: correct, color: 'text-green-600' },
            { icon: 'cancel', label: 'Wrong', value: wrong, color: 'text-error' },
            { icon: 'remove_circle', label: 'Skipped', value: skipped, color: 'text-outline' },
            { icon: 'schedule', label: 'Time', value: `${mins}m ${secs}s`, color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
              <span className={`material-symbols-outlined ${s.color} text-[22px] mb-1 block`}>{s.icon}</span>
              <p className="text-h2 text-on-surface">{s.value}</p>
              <p className="text-label-sm text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Anti-cheat note */}
        {attempt.status === 'auto-submitted' && (
          <div className="flex items-start gap-3 p-4 bg-error-container border border-error/20 rounded-xl mb-6">
            <span className="material-symbols-outlined text-on-error-container text-[20px] mt-0.5">gpp_maybe</span>
            <div>
              <p className="text-label-md text-on-error-container font-bold">This attempt was auto-submitted</p>
              <p className="text-label-sm text-on-error-container/80 mt-0.5">
                The student exceeded the maximum number of anti-cheat violations and the exam was force-submitted by the system.
              </p>
            </div>
          </div>
        )}

        {/* AI Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => navigate(`/instructor/cheat-analysis/${attemptId}`)}
            className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-error/20 rounded-xl hover:bg-error-container/10 transition-all text-left"
          >
            <span className="material-symbols-outlined text-error text-[26px]">policy</span>
            <div>
              <p className="text-label-md text-on-surface font-bold">AI Cheat Analysis</p>
              <p className="text-label-sm text-on-surface-variant">Analyse violations with Gemini AI</p>
            </div>
          </button>
          <button
            onClick={() => navigate(`/instructor/plagiarism/${attempt.exam?._id}`)}
            className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-primary/20 rounded-xl hover:bg-primary/5 transition-all text-left"
          >
            <span className="material-symbols-outlined text-primary text-[26px]">content_copy</span>
            <div>
              <p className="text-label-md text-on-surface font-bold">Plagiarism Report</p>
              <p className="text-label-sm text-on-surface-variant">Check exam-wide similarity</p>
            </div>
          </button>
        </div>

        {/* Anti-cheat logs */}
        {violations?.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant bg-error-container/10">
              <h2 className="text-h3 text-error flex items-center gap-2">
                <span className="material-symbols-outlined">policy</span>
                Anti-Cheat Violations ({violations.length})
              </h2>
            </div>
            <div className="divide-y divide-outline-variant">
              {violations.map((v, i) => (
                <div key={v._id || i} className="px-6 py-3 flex justify-between items-center hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-error text-[20px]">
                      {v.eventType === 'tab-switch' ? 'tab' :
                        v.eventType === 'fullscreen-exit' ? 'fullscreen_exit' :
                          v.eventType === 'copy-paste' ? 'content_copy' : 'warning'}
                    </span>
                    <p className="text-label-md text-on-surface capitalize">
                      {v.eventType.replace('-', ' ')}
                    </p>
                  </div>
                  <p className="text-label-sm text-on-surface-variant font-mono">
                    {new Date(v.detectedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question review */}
        {attempt.perQuestionResult?.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
            <div className="px-6 py-4 border-b border-outline-variant">
              <h2 className="text-h2 text-on-surface">Question-by-Question Review</h2>
            </div>
            <div className="divide-y divide-outline-variant">
              {attempt.perQuestionResult.map((r, i) => (
                <div key={i} className="px-6 py-5">
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined text-[20px] mt-0.5 flex-shrink-0
                      ${r.isCorrect ? 'text-green-600' : 'text-error'}`}>
                      {r.isCorrect ? 'check_circle' : 'cancel'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-label-md text-on-surface font-bold">
                          Q{i + 1}: {r.question?.text}
                        </p>
                        {r.question && (
                          <button onClick={() => handleEditClick(r)} className="text-label-sm text-primary hover:underline flex items-center gap-1 flex-shrink-0">
                            <span className="material-symbols-outlined text-[16px]">edit</span> Edit Grade
                          </button>
                        )}
                      </div>

                      {/* Show all options for MCQ so instructor sees full context */}
                      {r.question?.type === 'mcq' && r.question?.options?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                          {r.question.options.map((opt, oi) => {
                            const isStudentChoice = opt === r.studentAnswer
                            const isCorrectChoice = opt === r.correctAnswer
                            return (
                              <div key={oi}
                                className={`text-label-sm px-2 py-1 rounded border
                                  ${isCorrectChoice ? 'border-green-300 bg-green-50 text-green-700' :
                                    isStudentChoice ? 'border-error/30 bg-error-container text-on-error-container' :
                                      'border-outline-variant text-on-surface-variant'}`}>
                                {opt}
                                {isCorrectChoice && <FaCheck className="inline ml-1" />}
                                {isStudentChoice && !isCorrectChoice && <FaTimes className="inline ml-1" />}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-label-sm text-on-surface-variant w-32 flex-shrink-0">Student answer:</span>
                          <span className={`text-label-md px-2 py-0.5 rounded
                            ${r.isCorrect ? 'bg-green-100 text-green-700' : 'bg-error-container text-on-error-container'}`}>
                            {r.studentAnswer || <em className="text-outline not-italic">Skipped</em>}
                          </span>
                        </div>
                        {!r.isCorrect && !['written', 'coding'].includes(r.question?.type) && (
                          <div className="flex items-center gap-2">
                            <span className="text-label-sm text-on-surface-variant w-32 flex-shrink-0">Correct answer:</span>
                            <span className="text-label-md px-2 py-0.5 rounded bg-green-100 text-green-700">
                              {r.correctAnswer}
                            </span>
                          </div>
                        )}
                        {r.question?.explanation && (
                          <p className="text-label-sm text-on-surface-variant mt-2 pl-2 border-l-2 border-outline-variant">
                            {r.question.explanation}
                          </p>
                        )}
                      </div>

                      {/* Display AI Feedback / Scores if applicable */}
                      {(r.aiGraded || ['written', 'coding'].includes(r.question?.type)) && (
                        <div className="mt-3 p-3 bg-surface-container rounded-lg border border-outline-variant text-label-sm space-y-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-on-surface">Grade: <span className="text-primary">{r.score}</span> / {r.maxScore}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${r.isCorrect ? 'bg-green-100 text-green-700' : 'bg-error-container text-on-error-container'}`}>
                              {r.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          {r.feedback && <p><span className="font-bold text-on-surface-variant">Feedback:</span> {r.feedback}</p>}
                          {r.codeReview && <p className="font-mono text-[11px] whitespace-pre-wrap mt-2 bg-surface-container-lowest p-2 rounded"><span className="font-bold font-sans text-on-surface-variant block mb-1">Code Review:</span>{r.codeReview}</p>}
                        </div>
                      )}

                      {/* Manual Grade Override Form */}
                      {editingGrade === r.question?._id && (
                        <form onSubmit={(e) => handleGradeSubmit(e, r)} className="mt-4 p-4 bg-surface-container-high rounded-lg border border-primary/30 space-y-3">
                          <h4 className="text-label-md font-bold text-primary flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">edit_note</span>
                            Manual Grade Override
                          </h4>
                          
                          {['written', 'coding'].includes(r.question?.type) ? (
                            <div className="space-y-1">
                              <label className="text-label-sm text-outline">Score (Max: {r.maxScore})</label>
                              <input type="number" min="0" max={r.maxScore} step="any" required
                                value={gradeForm.score} onChange={e => setGradeForm({...gradeForm, score: Number(e.target.value)})}
                                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:border-primary focus:outline-none" />
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 cursor-pointer mt-2 mb-2">
                              <input type="checkbox" checked={gradeForm.isCorrect} 
                                onChange={e => setGradeForm({...gradeForm, isCorrect: e.target.checked})}
                                className="w-4 h-4 text-primary bg-surface-container-lowest border-outline-variant rounded focus:ring-primary focus:ring-2" />
                              <span className="text-label-sm text-on-surface">Mark as Correct (awards full points)</span>
                            </label>
                          )}
                          
                          <div className="space-y-1">
                            <label className="text-label-sm text-outline">Feedback / Notes</label>
                            <textarea value={gradeForm.feedback} onChange={e => setGradeForm({...gradeForm, feedback: e.target.value})}
                              rows="2" placeholder="Explain the grade change..."
                              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm resize-none focus:border-primary focus:outline-none" />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setEditingGrade(null)} disabled={savingGrade}
                              className="px-4 py-2 text-label-sm text-on-surface-variant hover:bg-surface-container rounded-lg transition-all">Cancel</button>
                            <button type="submit" disabled={savingGrade}
                              className="px-4 py-2 bg-primary text-on-primary text-label-sm rounded-lg hover:opacity-90 transition-all disabled:opacity-50">
                              {savingGrade ? 'Saving...' : 'Save Grade'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default AttemptDetail
