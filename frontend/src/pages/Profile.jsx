import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'
import { IMAGE_BASE_URL } from '../utils/constants'

function Profile() {
  const { user, login, token } = useAuth()
  const [form, setForm]    = useState({ name: user?.name || '', email: user?.email || '' })
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess]  = useState('')
  const [error, setError]      = useState('')
  const [photoPreview, setPhotoPreview] = useState(
    user?.profilePhoto ? (user.profilePhoto.startsWith('http') ? user.profilePhoto : `${IMAGE_BASE_URL}${user.profilePhoto}`) : null
  )
  const fileInputRef = useRef(null)

  const handleFormChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setSaving(true)
    try {
      const { data } = await api.put('/users/me', form)
      // update AuthContext so the sidebar name updates too
      login(data.data.user, token)
      setSuccess('Profile updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Show preview immediately
    setPhotoPreview(URL.createObjectURL(file))

    const formData = new FormData()
    formData.append('photo', file)
    setUploading(true); setError(''); setSuccess('')

    try {
      const { data } = await api.post('/users/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const updatedUser = { ...user, profilePhoto: data.data.profilePhoto }
      login(updatedUser, token)
      setSuccess('Profile photo updated.')
    } catch (err) {
      setError(err.response?.data?.message || 'Photo upload failed.')
      setPhotoPreview(user?.profilePhoto ? (user.profilePhoto.startsWith('http') ? user.profilePhoto : `${IMAGE_BASE_URL}${user.profilePhoto}`) : null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-h1 text-on-surface">My Profile</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Manage your account details</p>
        </div>

        {/* Photo section */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-5">
          <h2 className="text-h3 text-on-surface mb-4">Profile Photo</h2>
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-outline-variant"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container text-[36px]">person</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white animate-spin text-[24px]">refresh</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-h3 text-on-surface">{user?.name}</p>
              <p className="text-body-md text-on-surface-variant capitalize mb-3">{user?.role}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
              <p className="text-label-sm text-on-surface-variant mt-1">JPEG, PNG or WebP · Max 10MB</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Edit form */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <h2 className="text-h3 text-on-surface mb-4">Account Details</h2>

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
              <p className="text-label-md text-green-700">{success}</p>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error-container flex items-center gap-2">
              <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
              <p className="text-label-md text-on-error-container">{error}</p>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1">
              <label className="text-label-sm text-outline">Full Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">person</span>
                <input
                  name="name" value={form.name}
                  onChange={handleFormChange} required
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm text-outline">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                <input
                  name="email" type="email" value={form.email}
                  onChange={handleFormChange} required
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm text-outline">Role</label>
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-container rounded-lg">
                <span className="material-symbols-outlined text-outline text-[20px]">badge</span>
                <span className="text-body-md text-on-surface capitalize">{user?.role}</span>
                <span className="ml-auto text-label-sm text-on-surface-variant">Cannot be changed here</span>
              </div>
            </div>

            <button
              type="submit" disabled={saving}
              className="w-full py-3 bg-primary-container text-on-primary-container rounded-lg text-label-md hover:opacity-90 transition-all disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}

export default Profile
