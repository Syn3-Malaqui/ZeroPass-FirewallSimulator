# Multi-stage build for ZeroPass Firewall Simulator

# Stage 1: Build the Next.js frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ ./

# Build the application
RUN npm run build

# Stage 2: Python backend
FROM python:3.9-slim AS backend

WORKDIR /app/backend

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Expose port
EXPOSE 8000

# Start the backend server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Stage 3: Production frontend
FROM node:18-alpine AS frontend

WORKDIR /app

# Copy built application from builder stage
COPY --from=frontend-builder /app/.next/standalone ./
COPY --from=frontend-builder /app/.next/static ./.next/static

# Expose port
EXPOSE 3000

# Start the frontend server
CMD ["node", "server.js"] 