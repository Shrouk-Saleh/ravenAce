import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

function ResultDetail() {
  const { attemptId }      = useParams()
  const [data, setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]  = useState('')

  useEffect(() => {
    api.get(`/results/${attemptId}`)
      .then(res => setData(res.data.data))
      .catch(() => setError('Could not load result.'))
      .finally(() => setLoading(false))
  }, [attemptId])

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )
  if (error || !data) return (
    <AppLayout>
      <p className="text-center py-16 text-on-surface-variant">{error || 'Not found.'}</p>
    </AppLayout>
  )

  const { attempt, summary } = data
  const pct = summary.percentage

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-2">
          <Link to="/history" className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> My Results
          </Link>
        </div>

        {/* Score hero */}
        <div className={`rounded-xl p-8 mb-6 text-center ${summary.passed ? 'bg-primary-container' : 'bg-error-container'}`}>
          <span className="material-symbols-outlined text-[56px] mb-2 block"
            style={{ color: summary.passed ? '#f5f3ff' : '#93000a' }}>
            {summary.passed ? 'workspace_premium' : 'assignment_late'}
          </span>
          <h1 className={`text-display-sm mb-1 ${summary.passed ? 'text-on-primary-container' : 'text-on-error-container'}`}>
            {summary.passed ? 'Passed!' : 'Not Passed'}
          </h1>
          <p className={`text-body-md mb-4 ${summary.passed ? 'text-on-primary-container/80' : 'text-on-error-container/80'}`}>
            {attempt.exam?.title}
          </p>
          <div className={`inline-flex items-baseline gap-1 text-[64px] font-bold leading-none
            ${summary.passed ? 'text-on-primary-container' : 'text-on-error-container'}`}>
            {summary.score}
            <span className="text-h2">/{summary.totalScore}</span>
          </div>
          <p className={`text-label-md mt-2 ${summary.passed ? 'text-on-primary-container/70' : 'text-on-error-container/70'}`}>
            {pct}% · Pass mark: {attempt.exam?.passingScore}
          </p>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: 'check_circle', label: 'Correct',  value: summary.correctCount,  color: 'text-green-600' },
            { icon: 'cancel',       label: 'Wrong',    value: summary.wrongCount,    color: 'text-error' },
            { icon: 'remove_circle',label: 'Skipped',  value: summary.skippedCount,  color: 'text-outline' },
            { icon: 'schedule',     label: 'Time',
              value: `${Math.floor(summary.timeTaken/60)}m ${summary.timeTaken%60}s`,
              color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
              <span className={`material-symbols-outlined ${s.color} text-[22px] mb-1 block`}>{s.icon}</span>
              <p className="text-h2 text-on-surface">{s.value}</p>
              <p className="text-label-sm text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>

        {/* AI Performance Report Banner */}
        <Link
          to={`/ai-report/${attemptId}`}
          className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4 hover:bg-primary/10 transition-all group"
        >
          <span className="material-symbols-outlined text-primary text-[28px]">insights</span>
          <div className="flex-1">
            <p className="text-label-md text-on-surface font-bold">AI Performance Analysis</p>
            <p className="text-label-sm text-on-surface-variant">Get strengths, weaknesses & study recommendations (Gemini AI)</p>
          </div>
          <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </Link>

        {/* Certificate link */}
        {summary.passed && (
          <Link to="/certificates" className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl mb-6 hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined text-primary text-[28px]">workspace_premium</span>
            <div>
              <p className="text-label-md text-on-surface font-bold">Certificate Earned</p>
              <p className="text-label-sm text-on-surface-variant">View and download your certificate</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto">arrow_forward</span>
          </Link>
        )}

        {/* Question review */}
        {attempt.perQuestionResult?.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-6">
            <div className="px-6 py-4 border-b border-outline-variant">
              <h2 className="text-h2 text-on-surface">Question Review</h2>
            </div>
            <div className="divide-y divide-outline-variant">
              {attempt.perQuestionResult.map((r, i) => (
                <div key={i} className="px-6 py-5">
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined text-[20px] mt-0.5 flex-shrink-0
                      ${r.aiGraded ? 'text-primary' : r.isCorrect ? 'text-green-600' : 'text-error'}`}>
                      {r.aiGraded ? 'smart_toy' : r.isCorrect ? 'check_circle' : 'cancel'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="text-label-md text-on-surface font-bold">
                          Q{i + 1}: {r.question?.text}
                        </p>
                        {r.aiGraded && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium flex-shrink-0">
                            AI Graded
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-label-sm text-on-surface-variant w-28 flex-shrink-0">Your answer:</span>
                          <span className={`text-label-md px-2 py-0.5 rounded ${
                            r.aiGraded
                              ? 'bg-primary/10 text-primary'
                              : r.isCorrect
                              ? 'bg-green-100 text-green-700'
                              : 'bg-error-container text-on-error-container'
                          }`}>
                            {r.studentAnswer || <em className="text-outline not-italic">Skipped</em>}
                          </span>
                        </div>

                        {/* AI graded: score + feedback + test results */}
                        {r.aiGraded && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-label-sm text-on-surface-variant">Score:</span>
                              <span className="text-label-md text-primary font-bold">{r.score}/{r.maxScore}</span>
                            </div>
                            {r.feedback && (
                              <p className="text-label-sm text-on-surface bg-surface-container p-2 rounded-lg">{r.feedback}</p>
                            )}
                            {/* Code test results */}
                            {r.testResults && r.testResults.length > 0 && (
                              <div className="space-y-1">
                                {r.testResults.filter(t => !t.isHidden).map((t, ti) => (
                                  <div key={ti} className={`flex items-center gap-2 text-label-sm px-2 py-1 rounded ${t.passed ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                                    <span className="material-symbols-outlined text-[14px]">{t.passed ? 'check' : 'close'}</span>
                                    Test {ti + 1}: {t.status} {t.time && `(${t.time}s)`}
                                  </div>
                                ))}
                              </div>
                            )}
                            {r.codeReview && (
                              <p className="text-label-sm text-on-surface-variant italic border-l-2 border-primary pl-2">{r.codeReview}</p>
                            )}
                            {/* Written strengths/weaknesses */}
                            {r.strengths?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {r.strengths.map((s, si) => (
                                  <span key={si} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[11px]">
                                    ✓ {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            {r.weaknesses?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {r.weaknesses.map((w, wi) => (
                                  <span key={wi} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[11px]">
                                    ✗ {w}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Traditional: correct answer */}
                        {!r.aiGraded && !r.isCorrect && (
                          <div className="flex items-center gap-2">
                            <span className="text-label-sm text-on-surface-variant w-28 flex-shrink-0">Correct:</span>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Link to="/exams" className="flex-1 py-3 border border-outline-variant rounded-lg text-label-md text-on-surface text-center hover:bg-surface-container transition-all">
            Browse Exams
          </Link>
          <Link to="/history" className="flex-1 py-3 bg-primary-container text-on-primary-container rounded-lg text-label-md text-center hover:opacity-90 transition-all">
            My Results
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}

export default ResultDetail
