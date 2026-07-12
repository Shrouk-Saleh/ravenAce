import { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../api/axios'
import socket from '../api/socket'
import { FaCheckSquare, FaAward, FaFileAlt, FaInfoCircle, FaCheckDouble, FaSpinner, FaBellSlash, FaCheck, FaTrash } from 'react-icons/fa'

// Icon and colour per notification type
const typeConfig = {
  result: { Icon: FaCheckSquare, color: 'text-primary', bg: 'bg-surface-container' },
  certificate: { Icon: FaAward, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  'new-exam': { Icon: FaFileAlt, color: 'text-secondary', bg: 'bg-surface-container' },
  system: { Icon: FaInfoCircle, color: 'text-outline', bg: 'bg-surface-container' },
}

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all') // all | unread
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const params = filter === 'unread' ? { unread: 'true' } : {}
      const { data } = await api.get('/notifications', { params })
      setNotifications(data.data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadNotifications() }, [filter])

  useEffect(() => {
    const onNew = (notif) => {
      setNotifications(prev => [
        { ...notif, _id: notif._id, read: false },
        ...prev,
      ])
      setUnreadCount(c => c + 1)
    }
    socket.on('notification:new', onNew)
    socket.on('notification:new-exam', onNew)
    return () => {
      socket.off('notification:new', onNew)
      socket.off('notification:new-exam', onNew)
    }
  }, [])

  const markOneRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(c => Math.max(0, c - 1))
    } catch (err) {
      console.error(err)
    }
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error(err)
    }
  }

  const deleteOne = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      const removed = notifications.find(n => n._id === id)
      setNotifications(prev => prev.filter(n => n._id !== id))
      if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1))
    } catch (err) {
      console.error(err)
    }
  }

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr)
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-h1 text-on-surface">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-body-md text-on-surface-variant mt-1">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-all"
            >
              <FaCheckDouble className="text-[16px]" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-surface-container rounded-lg mb-6 w-fit">
          {[
            { value: 'all', label: 'All' },
            { value: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-5 py-2 rounded-md text-label-md transition-all
                ${filter === tab.value
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <FaSpinner className="text-primary animate-spin text-[40px]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <FaBellSlash className="text-outline text-[56px] mb-4 block mx-auto" />
            <p className="text-body-lg text-on-surface-variant">
              {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant overflow-hidden">
            {notifications.map(n => {
              const cfg = typeConfig[n.type] || typeConfig.system
              const Icon = cfg.Icon
              return (
                <div
                  key={n._id}
                  className={`flex items-start gap-4 px-5 py-4 transition-all group
                    ${!n.read ? 'bg-surface-container-low' : 'hover:bg-surface-container-low'}`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`${cfg.color} text-[20px]`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-label-md text-on-surface ${!n.read ? 'font-bold' : ''}`}>
                      {n.message}
                    </p>
                    <p className="text-label-sm text-on-surface-variant mt-0.5">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                    {!n.read && (
                      <button
                        onClick={() => markOneRead(n._id)}
                        title="Mark as read"
                        className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
                      >
                        <FaCheck className="text-[16px]" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteOne(n._id)}
                      title="Delete"
                      className="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-all"
                    >
                      <FaTrash className="text-[16px]" />
                    </button>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default Notifications
