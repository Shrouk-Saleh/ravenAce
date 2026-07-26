require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const connectDB = require("./config/db");
const { globalErrorHandler } = require("./utils/errorUtils");
const { initSocket } = require("./utils/socket");
const mongoSanitize = require("express-mongo-sanitize");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const examRoutes = require("./routes/examRoutes");
const questionRoutes = require("./routes/questionRoutes");
const attemptRoutes = require("./routes/attemptRoutes");
const resultRoutes = require("./routes/resultRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const secureSessionRoutes = require("./routes/secureSessionRoutes");

const app = express();
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

// ── Startup env-var validation ───────────────────────────────────
// Warn loudly if any Stripe key is missing so issues surface at boot,
// not silently at runtime when a user tries to subscribe.
const REQUIRED_ENV = [
  "JWT_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_STANDARD_PRICE_ID",
  "STRIPE_PREMIUM_PRICE_ID",
  "FRONTEND_URL",
];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn(
    `⚠️  Missing required environment variables: ${missingEnv.join(", ")}\n` +
    `   Some features (e.g. Stripe payments) will not work correctly.`
  );
}

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      // Note: 'unsafe-inline' is kept for React/Vite development HMR and possible dynamic style/script injections.
      // 'unsafe-eval' is safely removed as it's not needed by frontend.
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      workerSrc: ["'self'", "blob:"],
    },
  },
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    process.env.ELECTRON_ORIGIN || "app://-"
  ],
  credentials: true,
}));

// Stripe webhook must use raw body before express.json() parses it
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: '100kb' }));
// Sanitize all request bodies, params, and query strings.
// Strips out any keys starting with '$' or containing '.' to prevent NoSQL injection.
app.use(mongoSanitize());

const { apiLimiter } = require("./middleware/rateLimiter");
const { protect } = require("./middleware/authMiddleware");
app.use("/api", apiLimiter);
app.use("/uploads", protect, express.static(path.join(__dirname, "uploads")));

// ── Health check — used by Render, Docker, and load balancers ───
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/results", resultRoutes);

app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/secure-session", secureSessionRoutes);

// ── Serve React frontend in production ──────────────────────────
// Serves the pre-built frontend whenever the dist folder exists,
// regardless of NODE_ENV (handles Render's environment variable behavior).
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
const fs = require("fs");
if (fs.existsSync(path.join(frontendDist, "index.html"))) {
  app.use(express.static(frontendDist));
  // SPA fallback — let React Router handle all non-API routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  console.warn("⚠️  frontend/dist not found — running in API-only mode.");
}

app.use(globalErrorHandler);

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Server running on port ${PORT} (HTTP + Socket.io)`));
}

module.exports = app;
