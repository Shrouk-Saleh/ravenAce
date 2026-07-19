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
connectDB();

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    process.env.ELECTRON_ORIGIN || "ravenace://"
  ],
  credentials: true,
}));

// Stripe webhook must use raw body before express.json() parses it
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
// Sanitize all request bodies, params, and query strings.
// Strips out any keys starting with '$' or containing '.' to prevent NoSQL injection.
app.use(mongoSanitize());

const { apiLimiter } = require("./middleware/rateLimiter");
app.use("/api", apiLimiter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

app.use(globalErrorHandler);

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} (HTTP + Socket.io)`));
