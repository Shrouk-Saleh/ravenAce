## HuggingFace Spaces — Docker Space
## This single container:
##   1. Installs all dependencies (backend + frontend)
##   2. Builds the React frontend into /app/frontend/dist
##   3. Starts the Express server (which serves both API + static UI)
##
## HuggingFace REQUIRES port 7860 for Docker Spaces.
## Set PORT=7860 in your HF Space Secrets.

FROM node:20-alpine

# Set working directory
WORKDIR /app

# ── Install backend dependencies ──────────────────────────────────
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# ── Install frontend dependencies ─────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --legacy-peer-deps

# ── Copy full source ──────────────────────────────────────────────
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# ── Build the React frontend ──────────────────────────────────────
# Vite reads VITE_ env vars at BUILD time from the environment.
# Set VITE_API_URL in HF Space Secrets to your Space URL.
RUN cd frontend && npm run build

# ── Runtime configuration ─────────────────────────────────────────
# HuggingFace Docker Spaces require port 7860
EXPOSE 7860

ENV NODE_ENV=production
ENV PORT=7860

# ── Start the Express server ──────────────────────────────────────
CMD ["node", "backend/server.js"]
