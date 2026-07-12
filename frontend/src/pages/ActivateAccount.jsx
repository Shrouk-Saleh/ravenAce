import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'

function ActivateAccount() {
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing activation token.')
    }
  }, [token])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.')
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.')
    }

    setLoading(true)
    try {
      await api.post('/auth/activate-account', {
        token,
        password: form.password,
        confirmPassword: form.confirmPassword
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Activation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed top-0 left-0 w-full h-1 bg-primary" />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">

          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-2">
              <img src="/logo.png" alt="Raven ACE Logo" className="w-24 h-24 object-contain" />
              <h1 className="text-display-sm text-on-surface m-0 leading-none">Raven ACE</h1>
            </div>
            <p className="text-body-md text-on-surface-variant">Activate Your Account</p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                </div>
                <h2 className="text-h2 text-on-surface mb-2">Account Activated!</h2>
                <p className="text-body-md text-on-surface-variant">Your password has been set successfully.</p>
                <p className="text-body-md text-on-surface-variant mt-2">Redirecting you to login...</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-error-container border border-error/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
                    <p className="text-label-md text-on-error-container">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-label-sm text-outline">New Password</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                      <input
                        name="password" type="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={handleChange}
                        required
                        disabled={!token || loading}
                        className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-label-sm text-outline">Confirm Password</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">enhanced_encryption</span>
                      <input
                        name="confirmPassword" type="password"
                        placeholder="••••••••"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        required
                        disabled={!token || loading}
                        className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!token || loading}
                    className="w-full bg-primary-container text-on-primary-container text-h3 py-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                  >
                    {loading ? 'Activating...' : 'Set Password'}
                    {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
      
      <div className="fixed -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  )
}

export default ActivateAccount
