import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api/axios'

function OrgStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/organization/students')
      setStudents(data.data.students)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/organization/students', form)
      setForm({ name: '', email: '' })
      setShowModal(false)
      fetchStudents()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add student')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (id) => {
    try {
      await api.patch(`/organization/students/${id}/toggle`)
      fetchStudents()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student? This cannot be undone.')) return
    try {
      await api.delete(`/organization/students/${id}`)
      fetchStudents()
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const handleResend = async (id) => {
    try {
      await api.post(`/organization/students/${id}/resend-invite`)
      alert('Invitation resent successfully.')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resend invitation')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 lg:pl-sidebar-width flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:pl-sidebar-width">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-display-sm text-on-surface">Manage Students</h1>
              <p className="text-body-md text-on-surface-variant">Invite and manage students for your organization.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Add Student
            </button>
          </div>

          {error && !showModal && (
            <div className="mb-6 p-4 rounded-lg bg-error-container border border-error/20 text-on-error-container flex items-center gap-2">
              <span className="material-symbols-outlined text-error">error</span>
              {error}
            </div>
          )}

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-4 text-label-sm font-semibold text-on-surface">Name</th>
                    <th className="px-6 py-4 text-label-sm font-semibold text-on-surface">Email</th>
                    <th className="px-6 py-4 text-label-sm font-semibold text-on-surface">Status</th>
                    <th className="px-6 py-4 text-label-sm font-semibold text-on-surface text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {students.map(student => (
                    <tr key={student._id} className="hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-sm">
                              {student.name.charAt(0).toUpperCase()}
                           </div>
                           <span className="text-body-md text-on-surface font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-body-md text-on-surface-variant">{student.email}</td>
                      <td className="px-6 py-4">
                        {student.isInvited ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-[12px] font-medium border border-tertiary/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                            Invited (Pending)
                          </span>
                        ) : (
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border ${student.isActive ? 'bg-primary-container text-on-primary-container border-primary/20' : 'bg-surface-container text-on-surface border-outline/20'}`}>
                             <span className={`w-1.5 h-1.5 rounded-full ${student.isActive ? 'bg-primary' : 'bg-outline'}`}></span>
                             {student.isActive ? 'Active' : 'Disabled'}
                           </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           {student.isInvited && (
                              <button onClick={() => handleResend(student._id)} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors tooltip-trigger" title="Resend Invite">
                                <span className="material-symbols-outlined text-[20px]">send</span>
                              </button>
                           )}
                           {!student.isInvited && (
                              <button onClick={() => handleToggle(student._id)} className={`p-2 rounded-lg transition-colors tooltip-trigger ${student.isActive ? 'text-error hover:bg-error/10' : 'text-primary hover:bg-primary/10'}`} title={student.isActive ? 'Disable' : 'Enable'}>
                                <span className="material-symbols-outlined text-[20px]">{student.isActive ? 'block' : 'check_circle'}</span>
                              </button>
                           )}
                          <button onClick={() => handleDelete(student._id)} className="p-2 rounded-lg text-error hover:bg-error/10 transition-colors tooltip-trigger" title="Delete">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-on-surface-variant">
                        No students found. Invite your first student!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md shadow-2xl border border-outline-variant overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface">
              <h2 className="text-h3 text-on-surface">Add Student</h2>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {error && (
                 <div className="p-3 rounded-lg bg-error-container border border-error/20 flex items-center gap-2">
                   <span className="material-symbols-outlined text-error">error</span>
                   <p className="text-label-sm text-error">{error}</p>
                 </div>
              )}
              
              <div className="space-y-1">
                <label className="text-label-sm text-outline">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">person</span>
                  <input
                    type="text" required
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Student Name"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-body-md focus:border-primary focus:outline-none input-halo transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-label-sm text-outline">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                  <input
                    type="email" required
                    value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="student@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-body-md focus:border-primary focus:outline-none input-halo transition-all"
                  />
                </div>
                <p className="text-[12px] text-on-surface-variant pt-1">They will receive an email to set their password.</p>
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-label-md hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Sending Invite...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default OrgStudents
