import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

function AdminExams() {
  const [exams, setExams]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    api.get('/admin/exams')
      .then(res => setExams(res.data.data.exams))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam? All its attempts will remain but the exam will be gone.')) return
    setDeleting(id)
    try {
      await api.delete(`/admin/exams/${id}`)
      setExams(prev => prev.filter(e => e._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = exams.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.instructor?.name?.toLowerCase().includes(search.toLowerCase())
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
        <h1 className="text-h1 text-on-surface">All Exams</h1>
        <p className="text-body-md text-on-surface-variant mt-1">{exams.length} exams across all instructors</p>
      </div>

      <div className="relative mb-6 max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
        <input
          type="text" placeholder="Search exam or instructor..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
        />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant">
              {['Title', 'Instructor', 'Questions', 'Status', 'Delete'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-label-sm text-on-surface-variant font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map(exam => (
              <tr key={exam._id} className="hover:bg-surface-container-low transition-all">
                <td className="px-5 py-4">
                  <p className="text-label-md text-on-surface font-bold">{exam.title}</p>
                  {exam.category && (
                    <p className="text-label-sm text-on-surface-variant">{exam.category}</p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <p className="text-label-md text-on-surface">{exam.instructor?.name || 'Unknown'}</p>
                  <p className="text-label-sm text-on-surface-variant">{exam.instructor?.email}</p>
                </td>
                <td className="px-5 py-4 text-label-md text-on-surface">
                  {exam.questions?.length || 0}
                </td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-label-sm font-bold
                    ${exam.isPublished ? 'bg-green-100 text-green-700' : 'bg-surface-container text-on-surface-variant'}`}>
                    {exam.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => handleDelete(exam._id)}
                    disabled={deleting === exam._id}
                    className="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-all disabled:opacity-40"
                    title="Delete exam"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-body-md text-on-surface-variant">No exams found.</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default AdminExams
