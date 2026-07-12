// src/api/socket.js
//
// Single shared Socket.io client for the whole app.
// We create ONE connection (not one per component) and export it,
// so every page that needs real-time updates just imports this file.
//
// Why a singleton instead of connecting inside each component?
// If every page created its own connection, switching pages would
// disconnect/reconnect constantly and the server would see dozens
// of sockets per user. One shared connection, registered once with
// the user's id, is simpler and matches how the backend's socket.js
// expects clients to behave (one "register" event per user).

import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
  autoConnect: false, // we connect manually once we know the user id
})

export default socket
