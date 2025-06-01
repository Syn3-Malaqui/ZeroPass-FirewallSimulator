# Multi-stage build for ZeroPass Firewall Simulator

# Stage 1: Build the Next.js frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Install system dependencies for Sharp (favicon generation)
RUN apk add --no-cache \
    libc6-compat \
    vips-dev

# Copy package files
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ ./

# Generate favicons if script exists
RUN if [ -f "public/favicon/generate-favicons.js" ]; then \
    cd public/favicon && npm install && node generate-favicons.js; \
    fi

# Build the application
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim AS backend

WORKDIR /app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Create a non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the backend server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

# Stage 3: Production frontend
FROM node:18-alpine AS frontend

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl

# Copy built application from builder stage
COPY --from=frontend-builder /app/.next/standalone ./
COPY --from=frontend-builder /app/.next/static ./.next/static

# Copy favicon files - use wildcard and conditional copying
COPY --from=frontend-builder /app/public/favicon/ ./public/favicon/
COPY --from=frontend-builder /app/public/favicon.ico ./public/
COPY --from=frontend-builder /app/public/favicon.svg ./public/
COPY --from=frontend-builder /app/public/robots.txt ./public/

# Copy manifest files if they exist
RUN if [ -f "./public/favicon/site.webmanifest" ]; then \
    cp ./public/favicon/site.webmanifest ./public/; \
    fi

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start the frontend server
CMD ["node", "server.js"] 