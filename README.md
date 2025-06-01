# 🛡️ ZeroPass Firewall Simulator

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.0.4-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)

A modern, full-stack Enterprise API Gateway Firewall Simulator with **complete user isolation**, **containerized deployment**, and **production-ready architecture**. Test and validate complex firewall rules in real-time without requiring production infrastructure.

## 🌟 Key Features

### 🔒 **Complete User Isolation**
- **Private Workspaces**: Each user gets isolated data storage
- **Session Management**: Secure session controls in header UI
- **Cross-Tab Protection**: Prevents data leakage between sessions
- **Backend Filtering**: Server-side data isolation with X-User-ID headers

### 🎨 **Modern UI/UX**
- **Floating Header Design**: Glass morphism with modern aesthetics
- **Custom Favicon System**: Professional PWA-ready branding
- **Responsive Layout**: Optimized for desktop, tablet, and mobile
- **Interactive Components**: Real-time validation and feedback

### 🏗️ **Production Architecture**
- **Docker Containerization**: Complete multi-service setup
- **Health Monitoring**: Built-in health checks and logging
- **Security Headers**: NGINX reverse proxy with rate limiting
- **Scalable Design**: Horizontal scaling with load balancing

### 🚀 **Enterprise Rule Engine**
- **Six Rule Categories**: IP, JWT, OAuth2, Rate Limiting, Headers, Paths
- **Real-Time Simulation**: Sub-millisecond rule evaluation
- **Comprehensive Logging**: Complete audit trail with reasoning
- **Advanced Validation**: Regex, CIDR, JSON schema support

## 📋 Rule Categories

| Category | Features | Use Cases |
|----------|----------|-----------|
| **🌐 IP Rules** | CIDR-based allow/block lists, IPv4/IPv6 support | Geolocation filtering, VPN detection |
| **🔑 JWT Validation** | Signature verification, claims checking, issuer validation | Authentication, token-based security |
| **🛡️ OAuth2 Scopes** | Fine-grained permissions, scope enforcement | Authorization, API access control |
| **⚡ Rate Limiting** | Sliding window, configurable thresholds | DDoS protection, API quotas |
| **📝 Header Rules** | Custom validation, regex matching, existence checks | Content-type enforcement, API versioning |
| **🛣️ Path Rules** | HTTP method filtering, URL pattern matching | Endpoint protection, route-based access |

## 🏃‍♂️ Quick Start

### 🐳 Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/ZeroPass-FirewallSimulator.git
cd ZeroPass-FirewallSimulator

# Start all services
docker-compose up -d

# Access the application
open http://localhost:3000
```

**Services:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health

### 🧑‍💻 Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## 🏗️ Architecture

### Core Components

#### 🖥️ **Frontend (Next.js 14)**
- **Modern React UI** with TypeScript and Tailwind CSS
- **User Session Management** with localStorage isolation
- **Real-time Rule Builder** with form validation
- **API Simulator Interface** with interactive testing
- **Evaluation Log Viewer** with filtering and search

#### ⚙️ **Backend (FastAPI)**
- **Rule Storage Engine** with in-memory management
- **Request Simulation Pipeline** with comprehensive evaluation
- **User Isolation Layer** with X-User-ID header filtering
- **Health Monitoring** with statistics and metrics
- **Audit Logging** with detailed evaluation trails

#### 🗄️ **Data Layer (Redis)**
- **Session Storage** for user isolation
- **Rate Limiting Store** with sliding windows
- **Cache Management** with automatic cleanup
- **Performance Optimization** with configurable memory limits

## 🔧 Configuration

### Environment Variables

#### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NODE_ENV=development
```

#### Backend (`.env`)
```bash
CORS_ORIGINS=http://localhost:3000,http://frontend:3000
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### Docker Profiles

- **Development**: `docker-compose -f docker-compose.dev.yml up`
- **Production**: `docker-compose up`
- **With NGINX**: `docker-compose --profile production up`

## 📊 User Interface

### 🏠 **Dashboard**
- **Session Controls**: User ID display, cache management, new session
- **Service Status**: Real-time health monitoring
- **Navigation**: Tabbed interface for all features

### 🔧 **Rule Builder**
- **Visual Form Interface**: Intuitive rule creation
- **Real-time Validation**: Instant feedback on configuration
- **Feature Badges**: Color-coded rule type indicators
- **JSON Preview**: Complete rule set configuration display

### 🧪 **API Simulator**
- **Request Builder**: Method, path, headers, authentication
- **JWT Token Support**: Token generation and validation
- **OAuth2 Simulation**: Scope testing with real-time results
- **Response Analysis**: Detailed decision reasoning

### 📈 **Evaluation Logs**
- **Real-time Monitoring**: Live request tracking
- **Detailed Analysis**: Step-by-step rule evaluation
- **Filtering & Search**: Advanced log management
- **Export Capabilities**: CSV/JSON data export

## 🚀 Deployment Options

### 🐳 **Docker (Recommended)**

**Production Deployment:**
```bash
# Build and deploy
docker-compose up -d

# With NGINX reverse proxy
docker-compose --profile production up -d

# Monitor services
docker-compose ps
docker-compose logs -f
```

**Development with Hot Reloading:**
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### ☁️ **Cloud Platforms**

#### **Vercel + Railway**
```bash
# Deploy frontend to Vercel
cd frontend && vercel --prod

# Deploy backend to Railway
# Connect GitHub repository
# Set environment variables in dashboard
```

#### **Render**
```bash
# Frontend: Static Site
# Build Command: npm run build
# Publish Directory: frontend/.next

# Backend: Web Service  
# Build Command: pip install -r requirements.txt
# Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

## 🔐 Security Features

### **User Isolation**
- ✅ Complete data separation between users
- ✅ Session-based access control
- ✅ Server-side filtering and validation
- ✅ Cross-tab protection

### **Container Security**
- ✅ Non-root users in all containers
- ✅ Security headers via NGINX
- ✅ Network isolation between services
- ✅ Resource limits and health checks

### **API Security**
- ✅ CORS configuration
- ✅ Rate limiting protection
- ✅ Request validation
- ✅ Audit logging

## 📈 Performance

- **Rule Evaluation**: Sub-millisecond processing
- **Concurrent Users**: 1000+ simultaneous sessions
- **Memory Efficient**: Optimized for cloud deployment
- **Scalable Architecture**: Horizontal scaling support

## 🛠️ Development

### **Prerequisites**
- Docker 20.10+ & Docker Compose 2.0+
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### **Development Commands**
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Execute commands in containers
docker-compose exec backend bash
docker-compose exec frontend sh

# Rebuild services
docker-compose up --build
```

### **Project Structure**
```
ZeroPass-FirewallSimulator/
├── 🎨 frontend/              # Next.js application
│   ├── app/                  # App router pages
│   ├── components/           # React components
│   ├── lib/                  # Utilities and stores
│   └── public/favicon/       # Favicon system
├── ⚙️ backend/               # FastAPI application
│   ├── main.py              # Main application
│   └── requirements.txt     # Python dependencies
├── 🐳 Docker files           # Container configuration
│   ├── Dockerfile           # Multi-stage build
│   ├── docker-compose.yml   # Production setup
│   ├── docker-compose.dev.yml # Development setup
│   └── nginx.conf           # Reverse proxy config
└── 📚 Documentation
    ├── DOCKER.md            # Container documentation
    └── README.md            # This file
```

## 🧪 Testing

### **Health Checks**
```bash
# Backend health
curl http://localhost:8000/health

# Frontend health  
curl http://localhost:3000

# Redis health
docker-compose exec redis redis-cli ping
```

### **User Isolation Testing**
```bash
# Test different users
curl -H "X-User-ID: user1" http://localhost:8000/rules
curl -H "X-User-ID: user2" http://localhost:8000/rules
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 **Documentation**: [DOCKER.md](DOCKER.md) for container setup
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-username/ZeroPass-FirewallSimulator/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-username/ZeroPass-FirewallSimulator/discussions)

---

<div align="center">

**Built with ❤️ for Enterprise Security Testing**

[⭐ Star this repo](https://github.com/your-username/ZeroPass-FirewallSimulator) | [🍴 Fork it](https://github.com/your-username/ZeroPass-FirewallSimulator/fork) | [📖 Read the docs](DOCKER.md)

</div> 