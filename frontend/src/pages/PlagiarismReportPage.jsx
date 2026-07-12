import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AppLayout from '../components/AppLayout'

function PlagiarismReportPage() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [threshold, setThreshold] = useState(0.85)
  const [expandedPair, setExpandedPair] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const examRes = await api.get(`/exams/${examId}`)
        setExam(examRes.data.data.exam)
        try {
          const repRes = await api.get(`/ai/plagiarism/${examId}`)
          setReport(repRes.data.data.report)
        } catch { /* none yet */ }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load exam.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [examId])

  const runDetection = async () => {
    setRunning(true); setError('')
    try {
      const { data } = await api.post(`/ai/plagiarism/${examId}`, { threshold })
      setReport(data.data.report)
    } catch (err) {
      setError(err.response?.data?.message || 'Detection failed. Make sure Gemini API is available.')
    } finally {
      setRunning(false)
    }
  }

  const simColor = (sim) => {
    if (sim >= 0.95) return 'text-red-600 font-bold'
    if (sim >= 0.9) return 'text-orange-600 font-semibold'
    return 'text-yellow-600'
  }

  const simBadge = (sim) => {
    if (sim >= 0.95) return 'bg-red-100 text-red-700 border border-red-200'
    if (sim >= 0.9) return 'bg-orange-100 text-orange-700 border border-orange-200'
    return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </button>
          <div>
            <h1 className="text-h1 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">content_copy</span>
              Plagiarism Detection
            </h1>
            {exam && <p className="text-body-md text-on-surface-variant">{exam.title}</p>}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error-container flex items-center gap-2">
            <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
            <p className="text-label-md text-on-error-container">{error}</p>
          </div>
        )}

        {/* Settings + Run */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-5">
          <h2 className="text-h3 text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">tune</span>
            Detection Settings
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-label-md text-on-surface">Similarity Threshold</label>
              <input
                type="range" min={0.5} max={0.99} step={0.01}
                value={threshold}
                onChange={e => setThreshold(parseFloat(e.target.value))}
                className="w-32"
              />
              <span className="text-label-md text-primary font-bold w-12">{Math.round(threshold * 100)}%</span>
            </div>
            <p className="text-label-sm text-on-surface-variant">Pairs above this threshold are flagged</p>
            <button
              onClick={runDetection}
              disabled={running}
              className="ml-auto px-5 py-2.5 bg-primary text-on-primary rounded-xl text-label-md hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {running ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Detecting...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">search</span> Run Detection</>
              )}
            </button>
          </div>
          <p className="text-label-sm text-on-surface-variant mt-2">
            Uses cosine similarity + Gemini explanations · Only analyses written-type questions
          </p>
        </div>

        {/* No report yet */}
        {!report && !running && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
            <span className="material-symbols-outlined text-primary text-[56px] block mb-3">manage_search</span>
            <h2 className="text-h2 text-on-surface mb-2">No Report Generated Yet</h2>
            <p className="text-body-md text-on-surface-variant">
              Click "Run Detection" to compare all written answers across student submissions.
            </p>
          </div>
        )}

        {/* Running */}
        {running && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
            <span className="material-symbols-outlined animate-spin text-primary text-[48px] block mb-4">refresh</span>
            <p className="text-h3 text-on-surface mb-1">Comparing answers...</p>
            <p className="text-body-md text-on-surface-variant">Computing similarity + generating AI explanations</p>
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Pairs Analysed', value: report.pairs?.length || 0, icon: 'groups', color: 'text-primary' },
                { label: 'Flagged Pairs', value: report.flaggedCount || 0, icon: 'flag', color: report.flaggedCount > 0 ? 'text-error' : 'text-green-600' },
                { label: 'Threshold Used', value: `${Math.round((report.threshold || 0.85) * 100)}%`, icon: 'tune', color: 'text-on-surface' },
              ].map(s => (
                <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
                  <span className={`material-symbols-outlined text-[28px] ${s.color} block mb-1`}>{s.icon}</span>
                  <p className={`text-h1 font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-label-sm text-on-surface-variant">{s.label}</p>
                </div>
              ))}
            </div>

            {report.pairs?.length === 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-green-500 text-[56px] block mb-3">verified_user</span>
                <h2 className="text-h2 text-on-surface mb-1">No Similar Answers Found</h2>
                <p className="text-body-md text-on-surface-variant">All answers are sufficiently unique above the {Math.round(report.threshold * 100)}% threshold.</p>
              </div>
            )}

            {/* Flagged Pairs */}
            {report.pairs?.filter(p => p.flagged).length > 0 && (
              <div>
                <h2 className="text-h2 text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-[22px]">flag</span>
                  Flagged Pairs
                </h2>
                <div className="space-y-3">
                  {report.pairs.filter(p => p.flagged).map((pair, i) => (
                    <div key={i} className="bg-surface-container-lowest border border-error/30 rounded-xl overflow-hidden">
                      {/* Pair header */}
                      <button
                        onClick={() => setExpandedPair(expandedPair === i ? null : i)}
                        className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-label-sm ${simBadge(pair.similarity)}`}>
                            {Math.round(pair.similarity * 100)}% similar
                          </span>
                          <div className="text-left">
                            <p className="text-label-md text-on-surface">
                              {pair.student1?.name || 'Student A'} ↔ {pair.student2?.name || 'Student B'}
                            </p>
                            <p className="text-label-sm text-on-surface-variant">
                              Q: {pair.question?.text?.slice(0, 60) || 'Unknown question'}...
                            </p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant">
                          {expandedPair === i ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {/* Expanded details */}
                      {expandedPair === i && (
                        <div className="px-4 pb-4 space-y-4 border-t border-outline-variant">
                          {pair.aiExplanation && (
                            <div className="mt-3 p-3 bg-error-container rounded-lg">
                              <p className="text-label-sm text-on-error-container font-medium mb-1">AI Explanation</p>
                              <p className="text-body-md text-on-error-container">{pair.aiExplanation}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-surface-container rounded-lg">
                              <p className="text-label-sm text-on-surface-variant mb-1">{pair.student1?.name || 'Student A'}</p>
                              <p className="text-body-md text-on-surface">{pair.answer1?.slice(0, 300)}{pair.answer1?.length > 300 ? '...' : ''}</p>
                            </div>
                            <div className="p-3 bg-surface-container rounded-lg">
                              <p className="text-label-sm text-on-surface-variant mb-1">{pair.student2?.name || 'Student B'}</p>
                              <p className="text-body-md text-on-surface">{pair.answer2?.slice(0, 300)}{pair.answer2?.length > 300 ? '...' : ''}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 text-label-sm text-on-surface-variant">
                            <span>{pair.student1?.email}</span>
                            <span>·</span>
                            <span>{pair.student2?.email}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={runDetection} disabled={running}
                className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span> Re-run
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default PlagiarismReportPage
