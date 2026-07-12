// utils/socket.js
//
// Wraps Socket.io with user-level AND org-level emission.
//
// Rooms used:
//   user:<userId>     → personal room for each connected user (reliable target)
//   org:<orgId>       → room for all users belonging to an organization
//   public            → room for users with no organization
//
// Security: the JWT is verified on connection. If missing or invalid,
// the handshake is rejected before the client can join any room.

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // ── JWT Authentication Middleware ─────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: no token provided."));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Authentication error: invalid token."));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;

    // ── Join personal room ────────────────────────────────────────────────
    socket.join(`user:${userId}`);

    // ── Join org room ─────────────────────────────────────────────────────
    // Lazy-load User model here to avoid circular dependency at module load time.
    try {
      const User = require("../models/User");
      const user = await User.findById(userId).select("organization role");
      if (user?.organization) {
        socket.join(`org:${user.organization.toString()}`);
      } else {
        socket.join("public");
      }
    } catch {
      // If DB fetch fails, user stays in personal room only — not catastrophic.
    }

    // No-op for legacy frontend clients that still send 'register'
    socket.on("register", () => { });

    socket.on("disconnect", () => {
      // Socket.io automatically removes the socket from all rooms on disconnect.
    });
  });

  return io;
};

// ── Emit to a specific user (all their tabs/devices) ─────────────────────────
const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

// ── Emit new-exam notification to the correct org room or public ──────────────
// orgId = null → emit to the 'public' room (no-org students)
// orgId = ObjectId → emit to 'org:<orgId>' room
const emitNewExamNotification = (event, payload, orgId) => {
  if (!io) return;
  const room = orgId ? `org:${orgId.toString()}` : "public";
  io.to(room).emit(event, payload);
};

// ── Legacy emitToAll — kept for backward compatibility (admin broadcasts) ─────
const emitToAll = (event, payload) => {
  if (!io) return;
  io.emit(event, payload);
};

module.exports = { initSocket, emitToUser, emitToAll, emitNewExamNotification };
