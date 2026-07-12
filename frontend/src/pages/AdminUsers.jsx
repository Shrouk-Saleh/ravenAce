import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { IMAGE_BASE_URL } from '../utils/constants'

const roleColors = {
  student:    'bg-surface-container text-on-surface-variant',
  instructor: 'bg-surface-container-high text-on-surface',
  admin:      'bg-primary-container text-on-primary-container',
}

function AdminUsers() {
  const { user: me }        = useAuth()
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/admin/users')
      .then(res => setUsers(res.data.data.users))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleRoleChange = async (id, role) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role })
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role.')
    }
  }

  const handleToggleActive = async (id) => {
    try {
      const { data } = await api.patch(`/admin/users/${id}/toggle-active`)
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: data.data.isActive } : u))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return
    try {
      await api.delete(`/admin/users/${id}`)
      setUsers(prev => prev.filter(u => u._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.')
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 text-on-surface">User Management</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{users.length} registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
        <input
          type="text" placeholder="Search by name or email..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
        />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant">
              {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-label-sm text-on-surface-variant font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map(u => (
              <tr key={u._id} className={`hover:bg-surface-container-low transition-all ${!u.isActive ? 'opacity-50' : ''}`}>
                {/* User */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {u.profilePhoto
                        ? <img src={u.profilePhoto.startsWith('http') ? u.profilePhoto : `${IMAGE_BASE_URL}${u.profilePhoto}`} className="w-9 h-9 rounded-full object-cover" alt="" />
                        : <span className="material-symbols-outlined text-on-surface-variant text-[18px]">person</span>
                      }
                    </div>
                    <div>
                      <p className="text-label-md text-on-surface font-bold">{u.name}</p>
                      <p className="text-label-sm text-on-surface-variant">{u.email}</p>
                    </div>
                  </div>
                </td>

                {/* Role selector */}
                <td className="px-5 py-4">
                  {u._id === me?._id ? (
                    <span className={`px-3 py-1 rounded-full text-label-sm font-bold capitalize ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u._id, e.target.value)}
                      className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-label-sm text-on-surface focus:border-primary focus:outline-none transition-all"
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </td>

                {/* Status toggle */}
                <td className="px-5 py-4">
                  {u._id === me?._id ? (
                    <span className="px-3 py-1 rounded-full text-label-sm bg-green-100 text-green-700">Active (you)</span>
                  ) : (
                    <button
                      onClick={() => handleToggleActive(u._id)}
                      className={`px-3 py-1 rounded-full text-label-sm font-bold transition-all hover:opacity-80
                        ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-error-container text-on-error-container'}`}
                    >
                      {u.isActive ? 'Active' : 'Disabled'}
                    </button>
                  )}
                </td>

                {/* Joined date */}
                <td className="px-5 py-4 text-label-sm text-on-surface-variant">
                  {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>

                {/* Delete */}
                <td className="px-5 py-4">
                  {u._id !== me?._id && (
                    <button
                      onClick={() => handleDelete(u._id)}
                      className="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-all"
                      title="Delete user"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-body-md text-on-surface-variant">No users match your search.</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default AdminUsers
