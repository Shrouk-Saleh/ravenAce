import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

function ExamStats() {
  const { examId } = useParams()
  const navigate   = useNavigate()
  const [exam, setExam]   = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [examRes, statsRes] = await Promise.all([
          api.get(`/exams/${examId}`),
          api.get(`/leaderboard/${examId}/stats`),
        ])
        setExam(examRes.data.data.exam)
        setStats(statsRes.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [examId])

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/instructor/exams')}
          className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary mb-6 transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> My Exams
        </button>

        <h1 className="text-h1 text-on-surface mb-1">{exam?.title}</h1>
        <p className="text-body-md text-on-surface-variant mb-6">Analytics & Statistics</p>

        {stats?.totalAttempts === 0 ? (
          <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <span className="material-symbols-outlined text-outline text-[48px] mb-3 block">analytics</span>
            <p className="text-body-lg text-on-surface-variant">No attempts yet — stats will appear after the first submission.</p>
          </div>
        ) : (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Attempts', value: stats?.totalAttempts, icon: 'assignment',   color: 'text-primary' },
                { label: 'Pass Rate',      value: `${stats?.passRate}%`, icon: 'trending_up', color: 'text-green-600' },
                { label: 'Avg Score',      value: stats?.avgScore,       icon: 'star',         color: 'text-yellow-500' },
                { label: 'Avg Time',
                  value: `${Math.floor((stats?.avgTime||0)/60)}m ${(stats?.avgTime||0)%60}s`,
                  icon: 'schedule', color: 'text-secondary' },
              ].map(s => (
                <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 text-center">
                  <span className={`material-symbols-outlined ${s.color} text-[28px] mb-1 block`}>{s.icon}</span>
                  <p className="text-h1 text-on-surface">{s.value}</p>
                  <p className="text-label-sm text-on-surface-variant">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Pass vs Fail bar */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6">
              <h2 className="text-h3 text-on-surface mb-4">Pass / Fail Breakdown</h2>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-label-sm text-green-600 w-12">Pass</span>
                <div className="flex-1 h-4 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${stats?.passRate || 0}%` }}
                  />
                </div>
                <span className="text-label-sm text-on-surface-variant w-8">{stats?.passedCount}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-label-sm text-error w-12">Fail</span>
                <div className="flex-1 h-4 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full transition-all"
                    style={{ width: `${100 - (stats?.passRate || 0)}%` }}
                  />
                </div>
                <span className="text-label-sm text-on-surface-variant w-8">{stats?.failedCount}</span>
              </div>
            </div>

            {/* Per-question difficulty */}
            {stats?.questionStats?.length > 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
                <div className="px-6 py-4 border-b border-outline-variant">
                  <h2 className="text-h2 text-on-surface">Question Difficulty</h2>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">% of students who answered correctly</p>
                </div>
                <div className="divide-y divide-outline-variant">
                  {stats.questionStats
                    .sort((a, b) => a.correctRate - b.correctRate) // hardest first
                    .map((q, i) => (
                      <div key={i} className="px-6 py-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-label-sm text-on-surface flex-1">{q.text}</p>
                          <span className={`text-label-sm font-bold flex-shrink-0
                            ${q.correctRate >= 70 ? 'text-green-600' : q.correctRate >= 40 ? 'text-yellow-600' : 'text-error'}`}>
                            {q.correctRate}%
                          </span>
                        </div>
                        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all
                              ${q.correctRate >= 70 ? 'bg-green-500' : q.correctRate >= 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
                            style={{ width: `${q.correctRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default ExamStats
