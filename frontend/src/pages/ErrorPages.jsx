import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Unauthorized() {
  const { user } = useAuth()
  const home = user?.role === 'instructor' ? '/instructor' : user?.role === 'admin' ? '/admin' : '/dashboard'
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <span className="material-symbols-outlined text-error text-[64px] mb-4 block">block</span>
        <h1 className="text-h1 text-on-surface mb-2">Access Denied</h1>
        <p className="text-body-lg text-on-surface-variant mb-6">You don't have permission to view this page.</p>
        <Link to={home} className="inline-flex items-center gap-2 px-6 py-3 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all">
          <span className="material-symbols-outlined text-[18px]">home</span>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-[96px] font-bold text-primary/20 leading-none mb-4">404</p>
        <h1 className="text-h1 text-on-surface mb-2">Page Not Found</h1>
        <p className="text-body-lg text-on-surface-variant mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-container text-on-primary-container text-label-md rounded-lg hover:opacity-90 transition-all">
          <span className="material-symbols-outlined text-[18px]">home</span>
          Go Home
        </Link>
      </div>
    </div>
  )
}
