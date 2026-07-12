import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

function InstructorDashboard() {
  const { user }          = useAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [openMenu, setOpenMenu] = useState(null)

  const handleTogglePublish = async (exam) => {
    try {
      const { data } = await api.patch(`/exams/${exam._id}/publish`)
      setExams(prev => prev.map(e =>
        e._id === exam._id ? { ...e, isPublished: data.data.isPublished } : e
      ))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle publish.')
    }
  }

  useEffect(() => {
    api.get('/exams')
      .then(res => setExams(res.data.data.exams))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const published = exams.filter(e => e.isPublished).length
  const drafts    = exams.filter(e => !e.isPublished).length

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-h1 text-on-surface">Instructor Dashboard</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Welcome back, {user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Exams',  value: exams.length, icon: 'assignment',  color: 'text-primary' },
          { label: 'Published',    value: published,    icon: 'public',      color: 'text-green-600' },
          { label: 'Drafts',       value: drafts,       icon: 'draft',       color: 'text-outline' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center">
              <span className={`material-symbols-outlined ${s.color} text-[24px]`}>{s.icon}</span>
            </div>
            <div>
              <p className="text-display-sm text-on-surface font-bold">{s.value}</p>
              <p className="text-label-md text-on-surface-variant">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link to="/instructor/exams/create"
          className="bg-primary-container text-on-primary-container rounded-xl p-6 flex items-center gap-4 hover:opacity-90 transition-all">
          <span className="material-symbols-outlined text-[32px]">add_circle</span>
          <div>
            <p className="text-h3">Create Exam</p>
            <p className="text-label-sm opacity-80">Start a new exam</p>
          </div>
        </Link>
        <Link to="/instructor/questions"
          className="bg-surface-container-high border border-outline-variant text-on-surface rounded-xl p-6 flex items-center gap-4 hover:bg-surface-container-highest transition-all">
          <span className="material-symbols-outlined text-[32px] text-primary">quiz</span>
          <div>
            <p className="text-h3">Question Bank</p>
            <p className="text-label-sm text-on-surface-variant">Manage questions</p>
          </div>
        </Link>
      </div>

      {/* Recent exams */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-h2 text-on-surface">Recent Exams</h2>
          <Link to="/instructor/exams" className="text-label-md text-primary hover:underline">View all</Link>
        </div>
        {exams.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="material-symbols-outlined text-outline text-[40px] mb-2 block">assignment_late</span>
            <p className="text-body-md text-on-surface-variant">No exams yet.</p>
            <Link to="/instructor/exams/create"
              className="inline-block mt-4 px-5 py-2 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all">
              Create your first exam
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {exams.slice(0, 5).map(exam => (
              <div key={exam._id} className={`flex items-center justify-between px-6 py-4 ${openMenu === exam._id ? 'relative z-50' : ''}`}>
                <div>
                  <p className="text-label-md text-on-surface font-bold">{exam.title}</p>
                  <p className="text-label-sm text-on-surface-variant">
                    {exam.questions?.length || 0} questions · {exam.duration} min
                  </p>
                </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${exam.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                      {exam.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <button
                      onClick={() => handleTogglePublish(exam)}
                      className="px-3 py-1 rounded text-label-sm font-medium border border-outline-variant hover:bg-surface-container transition-all"
                    >
                      {exam.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                  <div className="relative ml-2">
                    <button
                      onClick={() => setOpenMenu(openMenu === exam._id ? null : exam._id)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant rounded-lg text-label-sm hover:bg-surface-container transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">settings</span> Configure
                      <span className="material-symbols-outlined text-[18px]">{openMenu === exam._id ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {openMenu === exam._id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)}></div>
                        <div className="absolute right-0 top-10 mt-1 w-48 bg-white border border-outline-variant rounded-lg shadow-xl z-50 py-1">
                          <Link
                            to={`/instructor/exams/${exam._id}/edit`}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container text-label-md transition-all text-on-surface"
                            onClick={() => setOpenMenu(null)}
                          >
                            <span className="material-symbols-outlined text-[18px] text-primary">edit</span> Edit Details
                          </Link>
                          <Link
                            to={`/instructor/exams/${exam._id}/questions`}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container text-label-md transition-all text-on-surface"
                            onClick={() => setOpenMenu(null)}
                          >
                            <span className="material-symbols-outlined text-[18px] text-secondary">quiz</span> Manage Questions
                          </Link>
                          <Link
                            to={`/instructor/exams/${exam._id}/results`}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container text-label-md transition-all text-on-surface"
                            onClick={() => setOpenMenu(null)}
                          >
                            <span className="material-symbols-outlined text-[18px] text-green-600">assignment_turned_in</span> View Results
                          </Link>
                          <Link
                            to={`/instructor/exams/${exam._id}/stats`}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container text-label-md transition-all text-on-surface"
                            onClick={() => setOpenMenu(null)}
                          >
                            <span className="material-symbols-outlined text-[18px] text-tertiary-container">analytics</span> Analytics
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default InstructorDashboard
