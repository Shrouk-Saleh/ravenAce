import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

function ExamList() {
  const [exams, setExams]       = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/exams')
      .then(res => setExams(res.data.data.exams))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = exams.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-h1 text-on-surface">Available Exams</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Browse and start a published exam</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
        <input
          type="text" placeholder="Search exams..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-outline text-[48px] mb-3 block">assignment_late</span>
          <p className="text-body-lg text-on-surface-variant">No exams found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((exam) => (
            <div key={exam._id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-h3 text-on-surface">{exam.title}</p>
                  {exam.category && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-surface-container text-label-sm text-on-surface-variant rounded-full">
                      {exam.category}
                    </span>
                  )}
                </div>
                <span className="material-symbols-outlined text-primary text-[28px]">assignment</span>
              </div>

              {exam.description && (
                <p className="text-body-md text-on-surface-variant line-clamp-2">{exam.description}</p>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: 'schedule', label: `${exam.duration} min` },
                  { icon: 'star', label: `${exam.passingScore}/${exam.totalScore} pass` },
                  { icon: 'repeat', label: `${exam.maxAttempts} attempt${exam.maxAttempts > 1 ? 's' : ''}` },
                ].map((info) => (
                  <div key={info.icon} className="bg-surface-container rounded-lg py-2 px-1">
                    <span className="material-symbols-outlined text-on-surface-variant text-[16px] block mb-0.5">{info.icon}</span>
                    <p className="text-label-sm text-on-surface-variant">{info.label}</p>
                  </div>
                ))}
              </div>

              <Link
                to={`/exams/${exam._id}`}
                className="w-full bg-primary-container text-on-primary-container text-label-md py-3 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-auto"
              >
                View & Start <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}

export default ExamList
