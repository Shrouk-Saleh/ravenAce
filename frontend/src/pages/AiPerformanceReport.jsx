import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AppLayout from '../components/AppLayout'

function AiPerformanceReport() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        // Load attempt info + try to get existing analysis
        const attemptRes = await api.get(`/attempts/${attemptId}`)
        setAttempt(attemptRes.data.data.attempt)
        try {
          const aiRes = await api.get(`/ai/analyze-performance/${attemptId}`)
          setAnalysis(aiRes.data.data.analysis)
        } catch {
          // No analysis yet — user will click to generate
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load attempt.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [attemptId])

  const generateAnalysis = async () => {
    setGenerating(true); setError('')
    try {
      const { data } = await api.post(`/ai/analyze-performance/${attemptId}`)
      setAnalysis(data.data.analysis)
    } catch (err) {
      setError(err.response?.data?.message || 'AI analysis failed. Make sure Gemini is available.')
    } finally {
      setGenerating(false)
    }
  }

  const readinessColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-500'
  }

  const readinessBg = (score) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </button>
          <div>
            <h1 className="text-h1 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">insights</span>
              AI Performance Report
            </h1>
            <p className="text-body-md text-on-surface-variant">Personalised analysis powered by Gemini AI</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error-container flex items-center gap-2">
            <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
            <p className="text-label-md text-on-error-container">{error}</p>
          </div>
        )}

        {/* Attempt summary card */}
        {attempt && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-display-sm text-on-surface font-bold">{attempt.score ?? '—'}</p>
                <p className="text-label-sm text-on-surface-variant">Score</p>
              </div>
              <div>
                <p className={`text-display-sm font-bold ${attempt.passed ? 'text-green-600' : 'text-error'}`}>
                  {attempt.passed ? 'PASS' : 'FAIL'}
                </p>
                <p className="text-label-sm text-on-surface-variant">Result</p>
              </div>
              <div>
                <p className="text-display-sm text-on-surface font-bold">
                  {attempt.timeTaken ? `${Math.round(attempt.timeTaken / 60)}m` : '—'}
                </p>
                <p className="text-label-sm text-on-surface-variant">Time Taken</p>
              </div>
            </div>
          </div>
        )}

        {/* No analysis yet */}
        {!analysis && !generating && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-primary text-[56px] block mb-3">psychology</span>
            <h2 className="text-h2 text-on-surface mb-2">No Analysis Yet</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              Generate a personalised AI performance report with your strengths, weaknesses, and study recommendations.
            </p>
            <button
              onClick={generateAnalysis}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl text-label-md hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
            >
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span> Generate AI Report
            </button>
          </div>
        )}

        {/* Generating */}
        {generating && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
            <span className="material-symbols-outlined animate-spin text-primary text-[48px] block mb-4">refresh</span>
            <p className="text-h3 text-on-surface mb-1">Analysing your performance...</p>
            <p className="text-body-md text-on-surface-variant">Gemini is generating your personalised report</p>
          </div>
        )}

        {/* Analysis Report */}
        {analysis && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-[22px]">summarize</span>
                <h2 className="text-h2 text-on-surface">Summary</h2>
              </div>
              <p className="text-body-lg text-on-surface leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Readiness Score */}
            {analysis.readinessScore !== undefined && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">trending_up</span>
                    <h2 className="text-h2 text-on-surface">Re-attempt Readiness</h2>
                  </div>
                  <span className={`text-h1 font-bold ${readinessColor(analysis.readinessScore)}`}>
                    {analysis.readinessScore}%
                  </span>
                </div>
                <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${readinessBg(analysis.readinessScore)}`}
                    style={{ width: `${analysis.readinessScore}%` }}
                  />
                </div>
                <p className="text-label-sm text-on-surface-variant mt-2">
                  {analysis.readinessScore >= 80 ? 'You are well-prepared for a re-attempt!' :
                   analysis.readinessScore >= 50 ? 'Review the recommended topics before re-attempting.' :
                   'Focus on the weaknesses below before re-attempting.'}
                </p>
              </div>
            )}

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[20px] text-green-600">thumb_up</span>
                  <h3 className="text-h3 text-on-surface">Strengths</h3>
                </div>
                {analysis.strengths?.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-body-md text-on-surface">
                        <span className="material-symbols-outlined text-green-500 text-[16px] mt-0.5 flex-shrink-0">check_circle</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-md text-on-surface-variant">No specific strengths identified.</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[20px] text-error">build</span>
                  <h3 className="text-h3 text-on-surface">Areas to Improve</h3>
                </div>
                {analysis.weaknesses?.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-body-md text-on-surface">
                        <span className="material-symbols-outlined text-error text-[16px] mt-0.5 flex-shrink-0">arrow_circle_right</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-md text-on-surface-variant">No specific weaknesses identified.</p>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-[22px]">school</span>
                  <h2 className="text-h2 text-on-surface">Study Recommendations</h2>
                </div>
                <div className="space-y-3">
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-surface-container rounded-lg">
                      <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-label-sm flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
                      <p className="text-body-md text-on-surface">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regenerate */}
            <div className="flex gap-3">
              <button
                onClick={generateAnalysis}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span> Regenerate
              </button>
              <button
                onClick={() => navigate(`/results/${attemptId}`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-label-md hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">assignment</span> View Results
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default AiPerformanceReport
