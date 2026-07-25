# Stage 1: Build the React frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Install frontend dependencies (latest Vite plugins won't need legacy-peer-deps)
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy frontend source and build it
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Production runtime environment
FROM node:20-alpine
WORKDIR /app

# Install ONLY production backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source code
COPY backend/ ./backend/

# Copy only the compiled static files from the builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

# HuggingFace / Render Runtime Config
EXPOSE 7860
ENV NODE_ENV=production
ENV PORT=7860

CMD ["node", "backend/server.js"]
