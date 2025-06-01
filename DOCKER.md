# Docker Setup for ZeroPass Firewall Simulator

This document explains how to run the ZeroPass Firewall Simulator using Docker containers with the latest features including user isolation, favicon system, and enhanced security.

## Quick Start

### Production Deployment
```bash
# Build and run all services
docker-compose up -d

# With nginx reverse proxy
docker-compose --profile production up -d

# View logs
docker-compose logs -f
```

### Development Mode
```bash
# Use development configuration with hot reloading
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

## Architecture

### Services

1. **Backend (FastAPI)** - Port 8000
   - Python 3.11 with FastAPI
   - User isolation with X-User-ID headers
   - Complete firewall rule simulation
   - Health checks and monitoring

2. **Frontend (Next.js)** - Port 3000
   - React 18 with Next.js 14
   - Modern UI with Tailwind CSS
   - User session management
   - Favicon system with PWA support

3. **Redis (Optional)** - Port 6379
   - Rate limiting and session storage
   - Persistent data with AOF
   - Memory optimization

4. **Nginx (Production)** - Port 80/443
   - Reverse proxy and load balancing
   - SSL/TLS termination
   - Static file serving and caching
   - Rate limiting and security headers

## Configuration

### Environment Variables

#### Backend (.env)
```bash
CORS_ORIGINS=http://localhost:3000,http://frontend:3000
ENVIRONMENT=production
LOG_LEVEL=INFO
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_BACKEND_URL=http://backend:8000
NODE_ENV=production
```

### Docker Compose Profiles

- **Default**: Backend + Frontend + Redis
- **Production**: All services + Nginx reverse proxy

## Development Setup

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### Development Commands
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Rebuild services
docker-compose -f docker-compose.dev.yml up --build

# Stop services
docker-compose -f docker-compose.dev.yml down

# View service logs
docker-compose -f docker-compose.dev.yml logs backend
docker-compose -f docker-compose.dev.yml logs frontend

# Execute commands in containers
docker-compose -f docker-compose.dev.yml exec backend bash
docker-compose -f docker-compose.dev.yml exec frontend sh
```

### Hot Reloading
- **Backend**: Uvicorn auto-reload enabled
- **Frontend**: Next.js development server with file watching
- **Volumes**: Source code mounted for live updates

## Production Deployment

### Basic Production
```bash
# Build and start all services
docker-compose up -d

# Check service health
docker-compose ps
docker-compose logs
```

### Production with Nginx
```bash
# Start with reverse proxy
docker-compose --profile production up -d

# View nginx logs
docker-compose logs nginx
```

### SSL/HTTPS Setup
1. Obtain SSL certificates
2. Place in `./ssl/` directory
3. Uncomment HTTPS server block in `nginx.conf`
4. Update volume mounts in `docker-compose.yml`

## User Isolation Features

### Session Management
- Each user gets a unique session ID
- Data isolation at both frontend and backend
- Session controls in the header UI

### Backend User Isolation
- X-User-ID header for user identification
- Server-side data filtering
- Complete data privacy between users

### Frontend User Management
- localStorage-based session storage
- User-specific data caching
- Cross-tab session protection

## Monitoring and Health Checks

### Health Endpoints
- Backend: `http://localhost:8000/health`
- Frontend: `http://localhost:3000`
- Redis: Built-in health checks

### Monitoring Commands
```bash
# Check all services status
docker-compose ps

# Monitor resource usage
docker stats

# View health check logs
docker-compose logs --tail=50 backend | grep health
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check if ports are in use
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000

# Use different ports
docker-compose up -d --scale frontend=1 -p 3001:3000
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Check Docker permissions
docker info
```

#### Build Failures
```bash
# Clean build cache
docker-compose down --volumes --remove-orphans
docker system prune -f

# Rebuild from scratch
docker-compose build --no-cache
```

#### Container Communication
```bash
# Check network connectivity
docker-compose exec frontend ping backend
docker-compose exec backend ping redis

# Inspect networks
docker network ls
docker network inspect zeropass-network
```

### Debugging

#### Backend Debugging
```bash
# View backend logs
docker-compose logs -f backend

# Access backend shell
docker-compose exec backend bash

# Check Python packages
docker-compose exec backend pip list
```

#### Frontend Debugging
```bash
# View frontend logs
docker-compose logs -f frontend

# Access frontend shell
docker-compose exec frontend sh

# Check Node packages
docker-compose exec frontend npm list
```

#### Database/Redis
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Monitor Redis commands
docker-compose exec redis redis-cli monitor

# Check Redis info
docker-compose exec redis redis-cli info
```

## Security Considerations

### Production Security
- Non-root users in containers
- Security headers via Nginx
- Rate limiting enabled
- CORS properly configured
- No development tools in production images

### Network Security
- Custom bridge network
- Service isolation
- No unnecessary port exposure
- SSL/TLS encryption (when configured)

### Data Security
- User isolation at all levels
- No data persistence by default
- Session-based access control
- Secure header forwarding

## Performance Optimization

### Build Optimization
- Multi-stage builds
- Layer caching
- .dockerignore for faster builds
- Minimal base images

### Runtime Optimization
- Resource limits in compose
- Health checks for reliability
- Proper restart policies
- Memory limits for Redis

### Scaling
```bash
# Scale frontend instances
docker-compose up -d --scale frontend=3

# Scale with nginx load balancing
docker-compose --profile production up -d --scale frontend=2
```

## Backup and Restore

### Data Backup
```bash
# Backup Redis data
docker-compose exec redis redis-cli BGSAVE
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./backup/

# Backup logs
docker-compose logs > ./backup/application.log
```

### Container Images
```bash
# Save images
docker save zeropass-firewall-simulator_backend > backend.tar
docker save zeropass-firewall-simulator_frontend > frontend.tar

# Load images
docker load < backend.tar
docker load < frontend.tar
```

## Maintenance

### Updates
```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d

# Clean old images
docker image prune -f
```

### Cleanup
```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down --volumes

# Clean everything
docker system prune -a --volumes
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review container logs
3. Verify environment configuration
4. Check Docker and Docker Compose versions 