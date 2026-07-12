import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function Register() {
  const [form, setForm]   = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

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
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        orgName: form.role === 'organization' ? form.orgName : undefined,
      })
      login(data.data.user, data.token)
      if (data.data.user.role === 'instructor') navigate('/instructor')
      else if (data.data.user.role === 'organization') navigate('/organization')
      else navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed top-0 left-0 w-full h-1 bg-primary" />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[480px]">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/logo.png" alt="Raven ACE Logo" className="w-24 h-24 object-contain" />
            </div>
            <h1 className="text-display-sm text-on-surface">Raven ACE</h1>
            <p className="text-body-md text-on-surface-variant mt-2">AI Certification & Examination</p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error-container border border-error/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
                <p className="text-label-md text-on-error-container">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-label-sm text-outline">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">person</span>
                  <input
                    name="name" type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Role selector */}
              <div className="space-y-1">
                <label className="text-label-sm text-outline">Account Role</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'student',    icon: 'person_search', label: 'Student' },
                    { value: 'instructor', icon: 'co_present',    label: 'Instructor' },
                    { value: 'organization', icon: 'domain',    label: 'Organization' },
                  ].map((r) => (
                    <label key={r.value} className="relative cursor-pointer">
                      <input
                        type="radio" name="role"
                        value={r.value}
                        checked={form.role === r.value}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="p-4 border border-outline-variant rounded-lg flex flex-col items-center gap-2 transition-all hover:bg-surface-container-low peer-checked:border-primary peer-checked:bg-surface-container text-center">
                        <span className="material-symbols-outlined text-outline peer-checked:text-primary">{r.icon}</span>
                        <span className="text-[12px] md:text-label-md text-on-surface-variant font-medium">{r.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Organization Name (conditional) */}
              {form.role === 'organization' && (
                <div className="space-y-1 animate-[fadeIn_0.2s_ease-out]">
                  <label className="text-label-sm text-outline">Organization Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">business</span>
                    <input
                      name="orgName" type="text"
                      placeholder="Acme Corp"
                      value={form.orgName || ''}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Password grid */}
              <div className="grid grid-cols-2 gap-3">
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
                      className="w-full pl-10 pr-3 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">Confirm</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">enhanced_encryption</span>
                    <input
                      name="confirmPassword" type="password"
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-3 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-container text-on-primary-container text-h3 py-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Register'}
                {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>
            </form>

            <p className="mt-6 text-center text-label-sm text-on-surface-variant">
              By registering, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-body-md text-on-surface-variant">
              Already have an account?{' '}
              <Link to="/login" className="text-primary text-h3 ml-1 hover:underline">Login</Link>
            </p>
          </div>
        </div>
      </main>

      <div className="fixed -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  )
}

export default Register
