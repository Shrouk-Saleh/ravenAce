import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'

// The forgot-password flow has 3 steps on one page:
// Step 1 — enter email → get OTP sent
// Step 2 — enter OTP   → get resetToken
// Step 3 — enter new password → done, redirect to login
function ForgotPassword() {
  const [step, setStep]           = useState(1)
  const [email, setEmail]         = useState('')
  const [otp, setOtp]             = useState('')
  const [resetToken, setResetToken] = useState('')
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [message, setMessage]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const navigate = useNavigate()

  // Step 1 — send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setMessage('If this email is registered, an OTP has been sent. Check your inbox.')
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  // Step 2 — verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-reset-otp', { email, otp })
      setResetToken(data.resetToken)
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.')
    } finally { setLoading(false) }
  }

  // Step 3 — reset password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setError('Passwords do not match.')
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password',
        { newPassword: passwords.newPassword, confirmPassword: passwords.confirmPassword },
        { headers: { Authorization: `Bearer ${resetToken}` } }
      )
      navigate('/login', { state: { message: 'Password reset successfully. Please log in.' } })
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed.')
    } finally { setLoading(false) }
  }

  const stepLabels = ['Email', 'Verify OTP', 'New Password']

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed top-0 left-0 w-full h-1 bg-primary" />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary-container mb-4">
              <span className="material-symbols-outlined text-on-primary-container text-[32px]">lock_reset</span>
            </div>
            <h1 className="text-h1 text-on-surface">Reset Password</h1>
            <p className="text-body-md text-on-surface-variant mt-2">
              {step === 1 && 'Enter your email to receive a one-time code.'}
              {step === 2 && 'Enter the 6-digit code sent to your email.'}
              {step === 3 && 'Choose a new password for your account.'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-label-sm font-bold transition-all
                  ${i + 1 <= step ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                  {i + 1 < step
                    ? <span className="material-symbols-outlined text-[14px]">check</span>
                    : i + 1}
                </div>
                <span className={`text-label-sm flex-1 ${i + 1 === step ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
                  {label}
                </span>
                {i < 2 && <div className={`h-px flex-1 ${i + 1 < step ? 'bg-primary' : 'bg-outline-variant'}`} />}
              </div>
            ))}
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
            {message && (
              <div className="mb-4 p-3 rounded-lg bg-surface-container flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">info</span>
                <p className="text-label-md text-on-surface">{message}</p>
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error-container flex items-center gap-2">
                <span className="material-symbols-outlined text-on-error-container text-[18px]">error</span>
                <p className="text-label-md text-on-error-container">{error}</p>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                    <input
                      type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com" required
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary-container text-on-primary-container text-h3 py-4 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? 'Sending...' : 'Send OTP'}
                  {!loading && <span className="material-symbols-outlined">send</span>}
                </button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">6-Digit OTP Code</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">pin</span>
                    <input
                      type="text" value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456" required maxLength={6}
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all tracking-widest text-center text-h2"
                    />
                  </div>
                  <p className="text-label-sm text-on-surface-variant">Sent to: {email}</p>
                </div>
                <button type="submit" disabled={loading || otp.length < 6}
                  className="w-full bg-primary-container text-on-primary-container text-h3 py-4 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                  {!loading && <span className="material-symbols-outlined">verified</span>}
                </button>
                <button type="button" onClick={() => { setStep(1); setError(''); setMessage('') }}
                  className="w-full text-label-md text-on-surface-variant hover:text-primary transition-colors">
                  ← Back to email
                </button>
              </form>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">New Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                    <input
                      type="password" value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      placeholder="••••••••" required
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm text-outline">Confirm Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">enhanced_encryption</span>
                    <input
                      type="password" value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      placeholder="••••••••" required
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:border-primary focus:outline-none input-halo transition-all"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary-container text-on-primary-container text-h3 py-4 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? 'Resetting...' : 'Reset Password'}
                  {!loading && <span className="material-symbols-outlined">check_circle</span>}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-label-md text-primary hover:underline">← Back to login</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
