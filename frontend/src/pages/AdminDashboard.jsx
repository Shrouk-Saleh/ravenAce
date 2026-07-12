import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'

function AdminDashboard() {
  const { user }          = useAuth()
  const [overview, setOverview] = useState(null)
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewRes, usersRes] = await Promise.all([
          api.get('/leaderboard/admin/overview'),
          api.get('/admin/users'),
        ])
        setOverview(overviewRes.data.data)
        setUsers(usersRes.data.data.users)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
        <h1 className="text-h1 text-on-surface">Admin Dashboard</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Platform overview — welcome back, {user?.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users',    value: overview?.totalUsers,    icon: 'group',              color: 'text-primary' },
          { label: 'Total Exams',    value: overview?.totalExams,    icon: 'assignment',          color: 'text-secondary' },
          { label: 'Total Attempts', value: overview?.totalAttempts, icon: 'fact_check',          color: 'text-orange-500' },
          { label: 'Certificates',   value: overview?.totalCerts,    icon: 'workspace_premium',   color: 'text-yellow-500' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col gap-2">
            <span className={`material-symbols-outlined ${s.color} text-[28px]`}>{s.icon}</span>
            <p className="text-display-sm text-on-surface font-bold">{s.value ?? '—'}</p>
            <p className="text-label-md text-on-surface-variant">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link to="/admin/users"
          className="flex items-center gap-4 p-5 bg-surface-container-lowest border border-outline-variant rounded-xl hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[24px]">manage_accounts</span>
          </div>
          <div>
            <p className="text-h3 text-on-surface">User Management</p>
            <p className="text-label-sm text-on-surface-variant">Roles, disable, delete</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant ml-auto">arrow_forward</span>
        </Link>
        <Link to="/admin/exams"
          className="flex items-center gap-4 p-5 bg-surface-container-lowest border border-outline-variant rounded-xl hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-[24px]">assignment</span>
          </div>
          <div>
            <p className="text-h3 text-on-surface">All Exams</p>
            <p className="text-label-sm text-on-surface-variant">View and moderate</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant ml-auto">arrow_forward</span>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
        <div className="px-6 py-4 border-b border-outline-variant">
          <h2 className="text-h2 text-on-surface">Recent Activity</h2>
        </div>
        {!overview?.recentAttempts?.length ? (
          <div className="px-6 py-10 text-center">
            <span className="material-symbols-outlined text-outline text-[40px] mb-2 block">history</span>
            <p className="text-body-md text-on-surface-variant">No activity yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {overview.recentAttempts.map(a => (
              <div key={a._id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-primary-container text-[16px]">person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label-md text-on-surface">
                    <span className="font-bold">{a.student?.name}</span>{' '}
                    submitted <span className="font-bold">{a.exam?.title}</span>
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {new Date(a.submittedAt || a.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-label-sm font-bold flex-shrink-0
                  ${a.passed ? 'bg-green-100 text-green-700' : 'bg-error-container text-on-error-container'}`}>
                  {a.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default AdminDashboard
