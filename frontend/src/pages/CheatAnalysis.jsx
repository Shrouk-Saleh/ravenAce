import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AppLayout from '../components/AppLayout'

const RISK_LEVELS = [
  { max: 25, label: 'Low Risk', color: 'text-green-600', bg: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  { max: 50, label: 'Moderate Risk', color: 'text-yellow-600', bg: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  { max: 75, label: 'High Risk', color: 'text-orange-600', bg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
  { max: 100, label: 'Critical Risk', color: 'text-red-600', bg: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
]

const getRisk = (score) => RISK_LEVELS.find(r => score <= r.max) || RISK_LEVELS[3]

function CheatAnalysis() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState(null)
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [violRes] = await Promise.all([
          api.get(`/attempts/${attemptId}/violations`)
        ])
        setViolations(violRes.data.data.violations || [])
        try {
          const aiRes = await api.get(`/ai/analyze-cheat/${attemptId}`)
          setAnalysis(aiRes.data.data.analysis)
        } catch { /* no analysis yet */ }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load attempt data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [attemptId])

  const runAnalysis = async () => {
    setGenerating(true); setError('')
    try {
      const { data } = await api.post(`/ai/analyze-cheat/${attemptId}`)
      setAnalysis(data.data.analysis)
    } catch (err) {
      setError(err.response?.data?.message || 'AI analysis failed. Make sure Gemini API is available.')
    } finally {
      setGenerating(false)
    }
  }

  // Count violation types
  const violationCounts = violations.reduce((acc, v) => {
    acc[v.eventType] = (acc[v.eventType] || 0) + 1
    return acc
  }, {})

  const violationLabels = {
    tab_switch: { label: 'Tab Switch', icon: 'tab' },
    window_blur: { label: 'Window Blur', icon: 'blur_on' },
    copy_paste: { label: 'Copy/Paste', icon: 'content_paste' },
    fullscreen_exit: { label: 'Fullscreen Exit', icon: 'fullscreen_exit' },
    right_click: { label: 'Right Click', icon: 'mouse' },
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
              <span className="material-symbols-outlined text-error text-[28px]">policy</span>
              AI Anti-Cheat Analysis
            </h1>
            <p className="text-body-md text-on-surface-variant">Violation analysis powered by Gemini AI</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error-container flex items-center gap-2">
            <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
            <p className="text-label-md text-on-error-container">{error}</p>
          </div>
        )}

        {/* Violation Summary */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-5">
          <h2 className="text-h2 text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">warning</span>
            Detected Violations ({violations.length} total)
          </h2>
          {violations.length === 0 ? (
            <div className="flex items-center gap-2 text-body-md text-on-surface-variant">
              <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
              No violations were recorded during this attempt.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(violationCounts).map(([type, count]) => {
                const info = violationLabels[type] || { label: type, icon: 'warning' }
                return (
                  <div key={type} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
                    <span className="material-symbols-outlined text-error text-[22px]">{info.icon}</span>
                    <div>
                      <p className="text-label-md text-on-surface">{info.label}</p>
                      <p className="text-h3 text-on-surface font-bold">{count}×</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Generate Analysis */}
        {!analysis && !generating && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-error text-[56px] block mb-3">gpp_maybe</span>
            <h2 className="text-h2 text-on-surface mb-2">Run AI Analysis</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              Gemini will analyse the violation pattern and generate a risk score with explanation.
            </p>
            <button
              onClick={runAnalysis}
              className="px-6 py-3 bg-error text-on-error rounded-xl text-label-md hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
            >
              <span className="material-symbols-outlined text-[20px]">policy</span> Run AI Analysis
            </button>
          </div>
        )}

        {/* Generating */}
        {generating && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
            <span className="material-symbols-outlined animate-spin text-primary text-[48px] block mb-4">refresh</span>
            <p className="text-h3 text-on-surface mb-1">Analysing violation patterns...</p>
            <p className="text-body-md text-on-surface-variant">Gemini is evaluating the cheat risk</p>
          </div>
        )}

        {/* Analysis Result */}
        {analysis && (() => {
          const risk = getRisk(analysis.riskScore)
          return (
            <div className="space-y-5">
              {/* Risk Score */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-h2 text-on-surface">Risk Score</h2>
                  <div className={`px-3 py-1.5 rounded-full text-label-md font-bold ${risk.badge}`}>
                    {risk.label}
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <span className={`text-[56px] font-bold leading-none ${risk.color}`}>{analysis.riskScore}</span>
                  <span className="text-h2 text-on-surface-variant">/100</span>
                </div>
                <div className="h-4 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-1000 ${risk.bg}`}
                    style={{ width: `${analysis.riskScore}%` }}
                  />
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                  <h2 className="text-h2 text-on-surface">AI Explanation</h2>
                </div>
                <p className="text-body-lg text-on-surface leading-relaxed">{analysis.explanation}</p>
              </div>

              {/* Evidence */}
              {analysis.evidence?.length > 0 && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-error text-[22px]">search</span>
                    <h2 className="text-h2 text-on-surface">Evidence</h2>
                  </div>
                  <ul className="space-y-2">
                    {analysis.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-body-md text-on-surface">
                        <span className="material-symbols-outlined text-error text-[16px] mt-0.5 flex-shrink-0">fiber_manual_record</span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendation */}
              <div className={`p-5 rounded-xl border-2 ${analysis.riskScore >= 75 ? 'border-error bg-error-container' : 'border-outline-variant bg-surface-container-lowest'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`material-symbols-outlined text-[22px] ${analysis.riskScore >= 75 ? 'text-on-error-container' : 'text-primary'}`}>gavel</span>
                  <h3 className={`text-h3 ${analysis.riskScore >= 75 ? 'text-on-error-container' : 'text-on-surface'}`}>Recommendation</h3>
                </div>
                <p className={`text-body-lg font-medium ${analysis.riskScore >= 75 ? 'text-on-error-container' : 'text-on-surface'}`}>{analysis.recommendation}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={runAnalysis} disabled={generating} className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all">
                  <span className="material-symbols-outlined text-[18px]">refresh</span> Re-analyse
                </button>
                <button onClick={() => navigate(`/instructor/results/${attemptId}`)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-label-md hover:opacity-90 transition-all">
                  <span className="material-symbols-outlined text-[18px]">assignment</span> View Attempt
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </AppLayout>
  )
}

export default CheatAnalysis
