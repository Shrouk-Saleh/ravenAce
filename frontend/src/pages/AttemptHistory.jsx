import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

function AttemptHistory() {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setLoading(true)
    api.get(`/attempts/history?page=${page}&limit=10`)
      .then(res => {
        setAttempts(res.data.data.attempts)
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.pages)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page])

  if (loading && attempts.length === 0) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-h1 text-on-surface">My Results</h1>
        <p className="text-body-md text-on-surface-variant mt-1">All your past exam attempts</p>
      </div>

      {attempts.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-outline text-[48px] mb-3 block">history</span>
          <p className="text-body-lg text-on-surface-variant">No attempts yet. Start an exam!</p>
          <Link to="/exams" className="inline-block mt-4 px-6 py-2.5 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all">
            Browse Exams
          </Link>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                {['Exam', 'Score', 'Status', 'Attempt #', 'Time Taken', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-label-sm text-on-surface-variant font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {attempts.map((a) => {
                const mins = Math.floor((a.timeTaken || 0) / 60)
                const secs = (a.timeTaken || 0) % 60
                const isGradeable = ['submitted', 'timed-out', 'auto-submitted'].includes(a.status)
                const statusLabel =
                  a.status === 'in-progress'    ? 'In Progress' :
                  a.status === 'abandoned'       ? 'Abandoned' :
                  a.status === 'auto-submitted'  ? 'Auto-Submitted' :
                  a.status === 'timed-out'       ? 'Timed Out' :
                  a.passed ? 'Passed' : 'Failed'
                const statusClass =
                  a.passed                       ? 'bg-green-100 text-green-700' :
                  a.status === 'in-progress'     ? 'bg-surface-container text-on-surface-variant' :
                  a.status === 'abandoned'       ? 'bg-surface-container-high text-on-surface-variant' :
                  'bg-error-container text-on-error-container'
                return (
                  <tr key={a._id} className="hover:bg-surface-container-low transition-all">
                    <td className="px-5 py-4">
                      <p className="text-label-md text-on-surface font-bold">{a.exam?.title}</p>
                      <p className="text-label-sm text-on-surface-variant">
                        Pass: {a.exam?.passingScore}/{a.exam?.totalScore}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-label-md text-on-surface">{a.score ?? '—'}/{a.exam?.totalScore ?? '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-label-md text-on-surface">#{a.attemptNumber}</td>
                    <td className="px-5 py-4 text-label-md text-on-surface-variant">
                      {a.timeTaken ? `${mins}m ${secs}s` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {isGradeable && (
                        <Link to={`/results/${a._id}`}
                          className="text-label-md text-primary hover:underline flex items-center gap-1">
                          Review <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 border border-outline-variant rounded-lg text-label-md disabled:opacity-50 hover:bg-surface-container transition-colors"
              >
                Previous
              </button>
              <span className="text-label-md text-on-surface-variant">Page {page} of {totalPages}</span>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border border-outline-variant rounded-lg text-label-md disabled:opacity-50 hover:bg-surface-container transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}

export default AttemptHistory
