import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../api/axios'

function OrgDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/organization/dashboard')
        setStats(data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:pl-sidebar-width">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          
          <div className="mb-8">
            <h1 className="text-display-sm text-on-surface">Organization Dashboard</h1>
            <p className="text-body-md text-on-surface-variant">Manage your institution, instructors, and students.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">co_present</span>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">Total Instructors</p>
                    <h3 className="text-h2 text-on-surface">{stats.totalInstructors}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">group</span>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">Total Students</p>
                    <h3 className="text-h2 text-on-surface">{stats.totalStudents}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">Certificates Issued</p>
                    <h3 className="text-h2 text-on-surface">{stats.totalCertificatesIssued}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">assignment</span>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">Total Attempts</p>
                    <h3 className="text-h2 text-on-surface">{stats.totalAttempts}</h3>
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="text-center py-12 text-on-surface-variant">
               Failed to load dashboard statistics.
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/organization/instructors" className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:bg-surface-container-low transition-all shadow-sm">
               <div className="flex items-center justify-between">
                  <h3 className="text-h3 text-on-surface group-hover:text-primary transition-colors">Manage Instructors</h3>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
               </div>
               <p className="text-body-md text-on-surface-variant mt-2">Invite new instructors and manage their access to your platform.</p>
            </Link>
            
            <Link to="/organization/students" className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:bg-surface-container-low transition-all shadow-sm">
               <div className="flex items-center justify-between">
                  <h3 className="text-h3 text-on-surface group-hover:text-primary transition-colors">Manage Students</h3>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
               </div>
               <p className="text-body-md text-on-surface-variant mt-2">Invite students, track their progress, and manage their status.</p>
            </Link>

            <Link to="/organization/subscription" className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:bg-surface-container-low transition-all shadow-sm">
               <div className="flex items-center justify-between">
                  <h3 className="text-h3 text-on-surface group-hover:text-primary transition-colors">Subscription</h3>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
               </div>
               <p className="text-body-md text-on-surface-variant mt-2">Manage your subscription plan, view limits, and update billing.</p>
            </Link>

            <Link to="/organization/profile" className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:bg-surface-container-low transition-all shadow-sm">
               <div className="flex items-center justify-between">
                  <h3 className="text-h3 text-on-surface group-hover:text-primary transition-colors">Organization Profile</h3>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
               </div>
               <p className="text-body-md text-on-surface-variant mt-2">Update organization details and branding (logo) for certificates.</p>
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}

export default OrgDashboard
