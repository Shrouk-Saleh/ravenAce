import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../api/axios'
import { IMAGE_BASE_URL } from '../utils/constants'

function OrgProfile() {
  const [profile, setProfile] = useState({ name: '', email: '', maxStudents: 0, maxInstructors: 0, subscriptionPlan: 'none' })
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/organization/profile')
      setProfile(data.data.organization)
      if (data.data.organization.logo) {
        const logo = data.data.organization.logo;
        setLogoPreview(logo.startsWith('http') ? logo : `${IMAGE_BASE_URL}${logo}`)
      }
    } catch (err) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)
    try {
      await api.put('/organization/profile', { name: profile.name })
      setMessage('Profile updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('logo', file)

    try {
      const { data } = await api.post('/organization/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const uploadedLogo = data.data.logo;
      setLogoPreview(uploadedLogo.startsWith('http') ? uploadedLogo : `${IMAGE_BASE_URL}${uploadedLogo}`)
      setMessage('Logo updated successfully. It will now appear on certificates.')
    } catch (err) {
      setError(err.response?.data?.message || 'Logo upload failed.')
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
        <div className="max-w-3xl mx-auto p-4 lg:p-8">
          
          <div className="mb-8">
            <h1 className="text-display-sm text-on-surface">Organization Profile</h1>
            <p className="text-body-md text-on-surface-variant">Manage your brand and see your current limits.</p>
          </div>

          {message && (
            <div className="mb-6 p-4 rounded-lg bg-primary-container/20 border border-primary/20 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">check_circle</span>
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-error-container border border-error/20 text-on-error-container flex items-center gap-2">
              <span className="material-symbols-outlined text-error">error</span>
              {error}
            </div>
          )}

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm mb-8">
            <h2 className="text-h3 text-on-surface mb-6">Brand & Identity</h2>
            
            <div className="flex flex-col md:flex-row gap-8 mb-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Organization Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="material-symbols-outlined text-[48px] text-outline">business</span>
                  )}
                </div>
                <div>
                  <input type="file" id="logoUpload" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <label htmlFor="logoUpload" className="cursor-pointer bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg text-label-md hover:opacity-90 transition-opacity">
                    Upload Logo
                  </label>
                </div>
                <p className="text-[12px] text-on-surface-variant max-w-[200px] text-center">
                  Will be displayed on certificates generated for your students.
                </p>
              </div>

              <form onSubmit={handleUpdateProfile} className="flex-1 space-y-5">
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">Organization Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">Owner Email (Read-only)</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-lg text-body-md text-on-surface-variant cursor-not-allowed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white px-6 py-2.5 rounded-lg text-label-md hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
            <h2 className="text-h3 text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">data_usage</span>
              Usage Limits
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-4 bg-surface-container rounded-lg">
                  <p className="text-label-sm text-on-surface-variant mb-1">Subscription Plan</p>
                  <p className="text-h3 text-on-surface capitalize">{profile.subscriptionPlan === 'none' ? 'Free Tier (Limits Exceeded/Inactive)' : profile.subscriptionPlan}</p>
               </div>
               <div className="p-4 bg-surface-container rounded-lg">
                  <p className="text-label-sm text-on-surface-variant mb-1">Max Instructors</p>
                  <p className="text-h3 text-on-surface">{profile.maxInstructors}</p>
               </div>
               <div className="p-4 bg-surface-container rounded-lg">
                  <p className="text-label-sm text-on-surface-variant mb-1">Max Students</p>
                  <p className="text-h3 text-on-surface">{profile.maxStudents === 999999 ? 'Unlimited' : profile.maxStudents}</p>
               </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-outline-variant">
               <Link to="/organization/subscription" className="text-primary hover:underline text-label-md flex items-center gap-1">
                 Manage Subscription <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
               </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default OrgProfile
