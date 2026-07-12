import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function Login() {
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user, loading: authLoading } = useAuth()
  const navigate  = useNavigate()

  // If the auth state is being restored, wait before deciding
  if (authLoading) return null

  // If already logged in, redirect to the appropriate dashboard
  if (user) {
    if (user.role === 'instructor') return <Navigate to="/instructor" replace />
    if (user.role === 'admin')      return <Navigate to="/admin" replace />
    if (user.role === 'organization') return <Navigate to="/organization" replace />
    return <Navigate to="/dashboard" replace />
  }

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.data.user, data.token)
      // redirect based on role
      if (data.data.user.role === 'instructor') navigate('/instructor')
      else if (data.data.user.role === 'admin')  navigate('/admin')
      else if (data.data.user.role === 'organization') navigate('/organization')
      else                                       navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* top accent line */}
      <div className="fixed top-0 left-0 w-full h-1 bg-primary" />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">

          {/* Brand */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-2">
              <img src="/logo.png" alt="Raven ACE Logo" className="w-24 h-24 object-contain" />
              <h1 className="text-display-sm text-on-surface m-0 leading-none">Raven ACE</h1>
            </div>
            <p className="text-body-md text-on-surface-variant">AI Certification & Examination</p>
          </div>

          {/* Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error-container border border-error/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
                <p className="text-label-md text-on-error-container">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-label-sm text-outline">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                  <input
                    name="email" type="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label-sm text-outline">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                  <input
                    name="password" type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                  />
                </div>
                <div className="text-right pt-1">
                  <Link to="/forgot-password" className="text-label-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-container text-on-primary-container text-h3 py-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <p className="text-body-md text-on-surface-variant">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary text-h3 ml-1 hover:underline">Register</Link>
            </p>
          </div>
        </div>
      </main>

      {/* bg blobs */}
      <div className="fixed -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  )
}

export default Login
