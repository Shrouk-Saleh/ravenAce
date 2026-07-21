import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../api/axios'
import socket from '../api/socket'
import { IMAGE_BASE_URL } from '../utils/constants'

const studentLinks = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/exams', icon: 'assignment', label: 'Available Exams' },
  { to: '/history', icon: 'history', label: 'My Results' },
  { to: '/certificates', icon: 'workspace_premium', label: 'Certificates' },
  { to: '/notifications', icon: 'notifications', label: 'Notifications' },
  { to: '/profile', icon: 'person', label: 'Profile' },
  // AI section (no 'to' = divider)
  { divider: true, label: 'AI Features' },
  { to: '/tutor/_', icon: 'psychology', label: 'AI Tutor', aiNote: 'Pick an exam first' },
]

const instructorLinks = [
  { to: '/instructor', icon: 'dashboard', label: 'Dashboard' },
  { to: '/instructor/exams', icon: 'assignment', label: 'My Exams' },
  { to: '/instructor/questions', icon: 'quiz', label: 'Question Bank' },
  { to: '/notifications', icon: 'notifications', label: 'Notifications' },
  { to: '/profile', icon: 'person', label: 'Profile' },
  // AI section
  { divider: true, label: 'AI Tools' },
  { to: '/instructor/generate-questions', icon: 'auto_awesome', label: 'Question Generator' },
]

const adminLinks = [
  { to: '/admin', icon: 'dashboard', label: 'Dashboard' },
  { to: '/admin/users', icon: 'group', label: 'Users' },
  { to: '/admin/exams', icon: 'assignment', label: 'All Exams' },
  { to: '/notifications', icon: 'notifications', label: 'Notifications' },
  { to: '/profile', icon: 'person', label: 'Profile' },
]

const organizationLinks = [
  { to: '/organization', icon: 'dashboard', label: 'Dashboard' },
  { to: '/organization/instructors', icon: 'co_present', label: 'Instructors' },
  { to: '/organization/students', icon: 'group', label: 'Students' },
  { to: '/organization/subscription', icon: 'credit_card', label: 'Subscription' },
  { to: '/organization/profile', icon: 'domain', label: 'Organization' },
  { to: '/notifications', icon: 'notifications', label: 'Notifications' },
  { to: '/profile', icon: 'person', label: 'My Profile' },
]

function Sidebar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [toast, setToast] = useState(null) // latest real-time notification
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fetch unread count once on mount, then keep it updated via Socket.io.
  // We also keep a 60s poll as a fallback in case the socket connection
  // drops silently (e.g. server restart) — it's cheap and self-healing.
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/notifications', { params: { unread: 'true' } })
        setUnread(data.unreadCount || 0)
      } catch { }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000)

    // Real-time: server pushes this the instant a result/certificate/
    // new-exam notification is created for this user.
    const onNewNotification = (notif) => {
      setUnread(c => c + 1)
      setToast(notif)
      setTimeout(() => setToast(null), 5000)
    }
    // Broadcast version — sent to ALL students when an exam is published
    const onNewExam = (data) => {
      if (user?.role === 'student') {
        setUnread(c => c + 1)
        setToast({ type: 'new-exam', message: data.message, refId: data.refId || data.examId })
        setTimeout(() => setToast(null), 5000)
      }
    }

    socket.on('notification:new', onNewNotification)
    socket.on('notification:new-exam', onNewExam)

    return () => {
      clearInterval(interval)
      socket.off('notification:new', onNewNotification)
      socket.off('notification:new-exam', onNewExam)
    }
  }, [user?.role])

  const links =
    user?.role === 'instructor' ? instructorLinks :
    user?.role === 'admin' ? adminLinks :
    user?.role === 'organization' ? organizationLinks :
    studentLinks

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mb-1">
            <img src="/logo.png" alt="Raven ACE Logo" className="w-12 h-12 object-contain" />
            <h2 className="text-h2 font-bold text-on-surface">Raven ACE</h2>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-on-surface-variant text-label-sm">AI Certification & Examination</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {links.map((link, idx) => {
          if (link.divider) return (
            <div key={idx} className="px-6 pt-4 pb-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-outline-variant" />
                <span className="text-label-sm text-primary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">smart_toy</span>{link.label}
                </span>
                <div className="flex-1 h-px bg-outline-variant" />
              </div>
            </div>
          )
          const active = location.pathname === link.to ||
            (link.to !== '/' && link.to !== '/tutor/_' && location.pathname.startsWith(link.to + '/'))
          const isNotif = link.to === '/notifications'
          return (
            <Link
              key={link.to}
              to={link.aiNote ? '#' : link.to}
              onClick={() => setMobileOpen(false)}
              title={link.aiNote || ''}
              className={`flex items-center gap-3 px-6 py-3 text-label-md transition-all
                ${active
                  ? 'text-primary font-bold border-l-4 border-primary bg-surface-container-low'
                  : link.aiNote
                    ? 'text-on-surface-variant border-l-4 border-transparent opacity-60 cursor-default'
                    : 'text-on-surface-variant hover:bg-surface-container border-l-4 border-transparent'
                }`}
            >
              <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
              <span className="flex-1">{link.label}</span>
              {link.aiNote && <span className="text-[10px] text-on-surface-variant">{link.aiNote}</span>}
              {isNotif && unread > 0 && (
                <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-white text-label-sm rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Dark mode toggle */}
      <div className="px-6 pb-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-all"
        >
          <span className="flex items-center gap-2 text-label-md text-on-surface">
            <span className="material-symbols-outlined text-[18px]">
              {theme === 'dark' ? 'dark_mode' : 'light_mode'}
            </span>
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <div className={`relative w-10 h-5 rounded-full transition-all ${theme === 'dark' ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${theme === 'dark' ? 'left-5' : 'left-0.5'}`} />
          </div>
        </button>
      </div>

      {/* User + logout */}
      <div className="px-6 pt-4 border-t border-outline-variant">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden flex-shrink-0">
            {user?.profilePhoto
              ? <img src={user.profilePhoto.startsWith('http') ? user.profilePhoto : `${IMAGE_BASE_URL}${user.profilePhoto}`} className="w-8 h-8 object-cover" alt="" />
              : <span className="material-symbols-outlined text-on-primary-container text-[16px]">person</span>
            }
          </div>
          <div className="min-w-0">
            <p className="text-label-md text-on-surface truncate">{user?.name}</p>
            <p className="text-label-sm text-on-surface-variant capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-label-md text-on-surface-variant hover:bg-surface-container hover:text-error transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar — hamburger trigger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-surface border-b border-outline-variant flex items-center justify-between px-4">
        <button onClick={() => setMobileOpen(true)} className="text-on-surface">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Raven ACE Logo" className="w-8 h-8 object-contain" />
          <span className="text-h3 font-bold text-on-surface">Raven ACE</span>
        </div>
        <Link to="/notifications" className="relative text-on-surface">
          <span className="material-symbols-outlined">notifications</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar (always visible) + Mobile sidebar (slide-in) */}
      <aside className={`fixed left-0 top-0 h-screen flex flex-col py-6 border-r border-outline-variant bg-surface w-sidebar-width z-50
        transition-transform duration-200
        md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      {/* Real-time notification toast */}
      {toast && (
        <div 
          onClick={() => {
            if (toast.type === 'result' && toast.refId) navigate(`/results/${toast.refId}`);
            else if (toast.type === 'certificate') navigate('/certificates');
            else if (toast.type === 'new-exam' && toast.refId) navigate(`/exams/${toast.refId}`);
            setToast(null);
          }}
          className="fixed top-4 right-4 z-[60] max-w-sm bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-4 flex items-start gap-3 animate-[fadeIn_0.2s_ease-out] cursor-pointer hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-primary text-[22px] flex-shrink-0">notifications_active</span>
          <p className="text-label-md text-on-surface flex-1">{toast.message || toast}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); setToast(null); }} 
            className="text-on-surface-variant hover:text-on-surface flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
    </>
  )
}

export default Sidebar
