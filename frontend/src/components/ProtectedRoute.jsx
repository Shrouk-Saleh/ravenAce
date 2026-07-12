import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wraps any route that needs a logged-in user.
// The optional `roles` prop restricts it further to specific roles.
// While auth state is being restored from localStorage, we show nothing
// to avoid a flash redirect to /login.
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) return null // still restoring session — don't redirect yet

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute
