import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'
import { API_BASE_URL, IMAGE_BASE_URL } from '../utils/constants'

function InstructorResults() {
  const { examId } = useParams()
  const navigate   = useNavigate()
  const [exam, setExam]         = useState(null)
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [examRes, attRes] = await Promise.all([
          api.get(`/exams/${examId}`),
          api.get(`/results/exam/${examId}/attempts`),
        ])
        setExam(examRes.data.data.exam)
        setAttempts(attRes.data.data.attempts)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [examId])

  const handleExportCSV = async () => {
    try {
      const response = await api.get(`/results/exam/${examId}/export-csv`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${exam?.title?.replace(/[^a-z0-9]/gi, '_')}_results.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      console.error('CSV export failed', err)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const handleExportPDF = async () => {
    try {
      const response = await api.get(`/results/exam/${examId}/export-pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${exam?.title?.replace(/[^a-z0-9]/gi, '_')}_results.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      console.error('PDF export failed', err)
      alert('Failed to export PDF. Please try again.')
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  const passed  = attempts.filter(a => a.passed).length
  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length)
    : 0

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-2">
        <button onClick={() => navigate('/instructor/exams')}
          className="flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> My Exams
        </button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-h1 text-on-surface">{exam?.title}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Student Results</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-container text-on-primary-container rounded-lg text-label-md hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            Export PDF
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Attempts', value: attempts.length, icon: 'assignment',   color: 'text-primary' },
          { label: 'Pass Rate',      value: `${attempts.length ? Math.round((passed/attempts.length)*100) : 0}%`,
            icon: 'trending_up', color: 'text-green-600' },
          { label: 'Avg Score',      value: `${avgScore}/${exam?.totalScore}`, icon: 'analytics', color: 'text-secondary' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex items-center gap-4">
            <span className={`material-symbols-outlined ${s.color} text-[28px]`}>{s.icon}</span>
            <div>
              <p className="text-h1 text-on-surface">{s.value}</p>
              <p className="text-label-sm text-on-surface-variant">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {attempts.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-outline text-[48px] mb-3 block">assignment_late</span>
          <p className="text-body-lg text-on-surface-variant">No attempts yet.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                {['Student', 'Score', 'Status', 'Time', 'Attempt #', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-label-sm text-on-surface-variant font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {attempts.map(a => {
                const mins = Math.floor((a.timeTaken||0)/60)
                const secs = (a.timeTaken||0) % 60
                return (
                  <tr key={a._id} className="hover:bg-surface-container-low transition-all">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {a.student?.profilePhoto
                            ? <img src={a.student.profilePhoto.startsWith('http') ? a.student.profilePhoto : `${IMAGE_BASE_URL}${a.student.profilePhoto}`} className="w-8 h-8 object-cover" alt="" />
                            : <span className="material-symbols-outlined text-on-primary-container text-[16px]">person</span>
                          }
                        </div>
                        <div>
                          <p className="text-label-md text-on-surface font-bold">{a.student?.name}</p>
                          <p className="text-label-sm text-on-surface-variant">{a.student?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-label-md text-on-surface">
                      {a.score}/{exam?.totalScore}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-3 py-1 rounded-full text-label-sm font-bold
                          ${a.passed ? 'bg-green-100 text-green-700' : 'bg-error-container text-on-error-container'}`}>
                          {a.passed ? 'Passed' : 'Failed'}
                        </span>
                        {a.status !== 'submitted' && (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider
                            ${a.status === 'auto-submitted' ? 'bg-error text-white' :
                              a.status === 'abandoned' ? 'bg-outline-variant text-on-surface' :
                              a.status === 'timed-out' ? 'bg-secondary text-white' :
                              'bg-surface-variant text-on-surface-variant'}`}>
                            {a.status === 'auto-submitted' ? 'Violations' : a.status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-label-md text-on-surface-variant">{mins}m {secs}s</td>
                    <td className="px-5 py-4 text-label-md text-on-surface">#{a.attemptNumber}</td>
                    <td className="px-5 py-4">
                      <Link to={`/instructor/results/${a._id}`}
                        className="text-label-md text-primary hover:underline flex items-center gap-1">
                        View <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  )
}

export default InstructorResults
