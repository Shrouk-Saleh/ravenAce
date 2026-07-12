import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

function MyExams() {
  const [exams, setExams]     = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null) // holds id being deleted
  const [openMenu, setOpenMenu] = useState(null)
  const navigate = useNavigate()

  const loadExams = () => {
    setLoading(true)
    api.get('/exams')
      .then(res => setExams(res.data.data.exams))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadExams() }, [])

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

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam? This cannot be undone.')) return
    setDeleting(id)
    try {
      await api.delete(`/exams/${id}`)
      setExams(prev => prev.filter(e => e._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[40px]">refresh</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 text-on-surface">My Exams</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{exams.length} exam{exams.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          to="/instructor/exams/create"
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Exam
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-outline text-[48px] mb-3 block">assignment</span>
          <p className="text-body-lg text-on-surface-variant mb-4">No exams yet.</p>
          <Link
            to="/instructor/exams/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create your first exam
          </Link>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                {['Title', 'Questions', 'Duration', 'Pass Score', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-label-sm text-on-surface-variant font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {exams.map(exam => (
                <tr key={exam._id} className={`hover:bg-surface-container-low transition-all ${openMenu === exam._id ? 'relative z-50' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="text-label-md text-on-surface font-bold">{exam.title}</p>
                    {exam.category && (
                      <span className="text-label-sm text-on-surface-variant">{exam.category}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-label-md text-on-surface">
                    {exam.questions?.length || 0}
                  </td>
                  <td className="px-5 py-4 text-label-md text-on-surface">
                    {exam.duration} min
                  </td>
                  <td className="px-5 py-4 text-label-md text-on-surface">
                    {exam.passingScore}/{exam.totalScore}
                  </td>
                  <td className="px-5 py-4 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${exam.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                      {exam.isPublished ? 'Published' : 'Draft'}
                    </span>
                    <button
                      onClick={() => handleTogglePublish(exam)}
                      className="px-3 py-1 rounded text-label-sm font-medium border border-outline-variant hover:bg-surface-container transition-all"
                    >
                      {exam.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                  </td>
                  <td className="px-5 py-4 relative">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOpenMenu(openMenu === exam._id ? null : exam._id)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant rounded-lg text-label-sm hover:bg-surface-container transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">settings</span> Configure
                        <span className="material-symbols-outlined text-[18px]">{openMenu === exam._id ? 'expand_less' : 'expand_more'}</span>
                      </button>
                    </div>
                    {openMenu === exam._id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)}></div>
                        <div className="absolute right-5 top-12 mt-1 w-48 bg-white border border-outline-variant rounded-lg shadow-xl z-50 py-1">
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
                          <div className="border-t border-outline-variant my-1"></div>
                          <button
                            onClick={() => { handleDelete(exam._id); setOpenMenu(null); }}
                            disabled={deleting === exam._id}
                            className="flex w-full items-center gap-3 px-4 py-2 hover:bg-error-container text-label-md transition-all text-error disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span> Delete Exam
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  )
}

export default MyExams
