import { createContext, useContext, useState, useEffect } from 'react'
import socket from '../api/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true) // true while restoring from localStorage

  // On first page load, restore session from localStorage and
  // connect the socket so the notification bell starts working
  // immediately, without requiring the user to log in again.
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setToken(savedToken)
      setUser(parsedUser)
      connectSocket(parsedUser, savedToken)
    }
    setLoading(false)

    // Disconnect when the whole app unmounts (page close/refresh)
    return () => socket.disconnect()
  }, [])

  // Connects the shared socket and sets the JWT token for auth.
  const connectSocket = (userData, tokenValue) => {
    if (!userData?._id && !userData?.id) return
    socket.auth = { token: tokenValue }
    if (!socket.connected) socket.connect()
  }

  const login = (userData, tokenValue) => {
    setUser(userData)
    setToken(tokenValue)
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(userData))
    connectSocket(userData, tokenValue)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    socket.disconnect()
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
