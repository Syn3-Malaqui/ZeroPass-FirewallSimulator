# ZeroPass Firewall Simulator

A full-stack web application that simulates and validates Enterprise API Gateway firewall rules in real-time. Built with Next.js frontend and FastAPI backend, designed for enterprise security testing and rule validation without requiring production infrastructure.

## Features

- **High-Fidelity Rule Simulation**: Implements enterprise-grade firewall logic with IP filtering, JWT validation, OAuth2 scopes, and rate limiting
- **Six Rule Categories**: IP Rules, JWT Validation, OAuth2 Scopes, Rate Limiting, Header Rules, and Path Rules
- **Comprehensive Rule Builder**: Visual form-based interface for creating complex firewall configurations
- **Real-Time API Testing**: Interactive simulator for testing API requests against defined rule sets
- **Detailed Evaluation Logs**: Complete audit trail with step-by-step rule evaluation and decision reasoning
- **Production-Ready Architecture**: Scalable FastAPI backend with Next.js frontend optimized for Vercel deployment
- **Zero Infrastructure Dependencies**: Runs locally or in cloud without requiring actual firewall hardware
- **Enterprise Security Standards**: Implements industry-standard authentication and authorization patterns

## Components

### Rule Builder (Frontend)
Provides intuitive form-based interface for creating firewall rule sets with real-time validation, CIDR notation support, and JSON configuration preview.

### API Simulator (Frontend)
- Interactive request builder with method, path, headers, and authentication
- JWT token generation and validation testing
- OAuth2 scope simulation with real-time results
- Visual decision display with detailed reasoning

### FastAPI Backend Engine
- **Rule Storage**: In-memory rule set management with REST API
- **Request Simulation**: Complete firewall evaluation pipeline
- **Authentication Validation**: JWT signature verification and claims checking
- **Rate Limiting**: Sliding window rate limiting with configurable thresholds
- **IP Filtering**: CIDR-based allow/block lists with IPv4/IPv6 support
- **Header/Path Matching**: Regex, exact, and prefix matching capabilities

### Evaluation Logger
Real-time logging system that captures:
- Complete request details and rule evaluation steps
- Decision rationale with matched rule identification
- Performance metrics and evaluation timing
- Historical analysis with filtering capabilities

### Dashboard Interface
Modern React-based interface with:
- Tabbed navigation between rule building, simulation, and logs
- Real-time status indicators and health monitoring
- Responsive design optimized for desktop and mobile
- Dark/light theme support with accessibility features

## Performance

- **Rule Evaluation Speed**: Sub-millisecond rule processing for typical configurations
- **Concurrent Requests**: Supports 1000+ simultaneous API simulations
- **Memory Efficient**: Optimized for cloud deployment with minimal resource usage
- **Zero Latency**: Local processing eliminates network dependencies during testing

## Rule Categories

The simulator supports six comprehensive rule categories:

1. **IP Rules**: CIDR-based allow/block lists with IPv4/IPv6 support
2. **JWT Validation**: Token signature verification, issuer/audience checking, claims validation
3. **OAuth2 Scopes**: Fine-grained permission checking with required scope enforcement
4. **Rate Limiting**: Sliding window algorithms with configurable thresholds and time windows
5. **Header Rules**: Custom header validation with regex, exact match, and existence checking
6. **Path Rules**: HTTP method and URL pattern matching with prefix, exact, and regex support

## Dependencies

### Frontend
- Next.js 14.0.4 with App Router
- React 18 with TypeScript
- TailwindCSS 3.3.0 for styling
- Zustand 4.4.7 for state management
- React Hook Form 7.48.2 for form handling
- Zod 3.22.4 for schema validation
- Axios 1.6.2 for API communication

### Backend
- FastAPI 0.104.1 for REST API
- Uvicorn 0.24.0 for ASGI server
- Pydantic 2.5.0 for data validation
- PyJWT 2.8.0 for token handling
- Python ipaddress for CIDR validation

## Building the Project

### Development Build
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && pip install -r requirements.txt

# Create environment configuration
cp env.example .env.local
```

### Production Build
```bash
# Build optimized frontend
npm run build

# Create Docker images
docker-compose build

# Deploy to Vercel
vercel --prod
```

## Creating Production Deployments

### Vercel Deployment (Recommended)

**Frontend Deployment:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
vercel --prod

# Set environment variables in Vercel dashboard
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

**Backend Deployment Options:**

**Railway (Recommended):**
```bash
# Connect GitHub repository to Railway
# Deploy backend folder automatically
# Set environment variables:
PORT=8000
CORS_ORIGINS=https://your-frontend-url.vercel.app
```

**Render:**
```bash
# Create new Web Service on Render
# Build Command: pip install -r requirements.txt
# Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
# Root Directory: backend
```

### Docker Deployment

**Development Environment:**
```bash
# Start both services
docker-compose up --build

# Access services
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

**Production Containers:**
```bash
# Build production images
docker build -t zeropass-frontend --target frontend .
docker build -t zeropass-backend --target backend .

# Deploy to cloud container service
docker run -d -p 3000:3000 zeropass-frontend
docker run -d -p 8000:8000 zeropass-backend
```

## Running the Application

### Local Development (Recommended)

**Start Backend Server:**
```bash
cd backend
python main.py
# Backend available at http://localhost:8000
```

**Start Frontend Development Server:**
```bash
npm run dev
# Frontend available at http://localhost:3000
```

### Docker Compose
   ```bash
docker-compose up
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Redis: http://localhost:6379 (optional)
```

### Production Deployment
```bash
# Frontend on Vercel
vercel --prod

# Backend on Railway/Render/Heroku
# Configure environment variables and deploy
```

## Usage

### Rule Builder Interface

1. **Navigation**: Click "Rule Builder" tab in the header
2. **Create Rule Set**:
   - **Basic Settings**: Configure name, description, default action
   - **IP Rules**: Set CIDR allow/block lists
   - **JWT Validation**: Configure token validation requirements
   - **OAuth2 Scopes**: Define required permission scopes
   - **Rate Limiting**: Set request thresholds and time windows
   - **Header Rules**: Custom header validation patterns
   - **Path Rules**: HTTP method and URL pattern matching

3. **Save and Manage**:
   - Save rule sets for reuse
   - Edit existing configurations
   - Copy rule sets for variations
   - Delete unused rule sets

### API Simulator Interface

1. **Select Rule Set**: Choose from available firewall configurations
2. **Configure Request**:
   - **Client IP**: Set source IP address for testing
   - **HTTP Method**: Select GET, POST, PUT, DELETE, etc.
   - **Request Path**: Define API endpoint URL
   - **Headers**: JSON-formatted request headers
   - **JWT Token**: Paste token or generate sample
   - **OAuth Scopes**: Comma-separated scope list

3. **Run Simulation**:
   - Click "Simulate Request" to execute
   - View real-time ALLOWED/BLOCKED decision
   - Analyze detailed evaluation reasoning
   - Review step-by-step rule processing

### Evaluation Logs Interface

1. **View History**: Access complete evaluation audit trail
2. **Filter Results**: Search by rule set, IP address, or decision
3. **Export Data**: Download logs for compliance reporting
4. **Real-Time Updates**: Monitor live simulation activity

## Rule Configuration Examples

### Enterprise API Protection
```json
{
  "name": "Production API Gateway",
  "default_action": "block",
  "ip_rules": {
    "type": "allow",
    "cidrs": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
  },
  "jwt_validation": {
    "enabled": true,
    "issuer": "https://auth.company.com",
    "audience": "api.company.com",
    "required_claims": {
      "role": "user",
      "verified": true
    }
  },
  "rate_limiting": {
    "enabled": true,
    "requests_per_window": 100,
    "window_seconds": 60
  }
}
```

### Development Environment
```json
{
  "name": "Development Testing",
  "default_action": "allow",
  "rate_limiting": {
    "enabled": true,
    "requests_per_window": 1000,
    "window_seconds": 60
  },
  "header_rules": [
    {
      "header_name": "X-API-Key",
      "condition": "exists"
    },
    {
      "header_name": "User-Agent",
      "condition": "regex",
      "value": "^(curl|PostmanRuntime).*"
    }
  ]
}
```

### Microservices Gateway
```json
{
  "name": "Internal Services",
  "default_action": "block",
  "oauth2_validation": {
    "enabled": true,
    "required_scopes": ["read", "write"]
  },
  "path_rules": [
    {
      "methods": ["GET"],
      "path_pattern": "/api/v1/health",
      "condition": "exact"
    },
    {
      "methods": ["POST", "PUT"],
      "path_pattern": "/api/v1/.*",
      "condition": "regex"
    }
  ]
}
```

## Advanced Features

### Custom JWT Claims Validation
```javascript
// Configure complex JWT requirements
{
  "jwt_validation": {
    "enabled": true,
    "issuer": "https://auth.company.com",
    "required_claims": {
      "role": "admin",
      "department": "engineering",
      "clearance_level": 3
    }
  }
}
```

### Rate Limiting Strategies
```python
# Sliding window rate limiting
rate_limiting: {
  "enabled": true,
  "requests_per_window": 100,
  "window_seconds": 60  # 100 requests per minute
}

# Burst protection
rate_limiting: {
  "enabled": true, 
  "requests_per_window": 10,
  "window_seconds": 1   # 10 requests per second
}
```

### Advanced Header Matching
```json
{
  "header_rules": [
    {
      "header_name": "Authorization",
      "condition": "regex",
      "value": "^Bearer [A-Za-z0-9-._~+/]+=*$"
    },
    {
      "header_name": "Content-Type",
      "condition": "equals",
      "value": "application/json"
    }
  ]
}
```

## Troubleshooting

### Common Issues
- **CORS Errors**: Verify NEXT_PUBLIC_BACKEND_URL environment variable
- **Rule Evaluation Failures**: Check CIDR notation and JSON syntax
- **Performance Issues**: Enable Redis for production rate limiting
- **Authentication Problems**: Validate JWT token format and claims

### Debug Mode
```bash
# Enable detailed logging
export LOG_LEVEL=DEBUG

# Check backend health
curl http://localhost:8000/health

# Verify frontend connection
curl http://localhost:3000/api/backend/health
```

### Production Monitoring
- Health check endpoints: `/health` (backend), `/` (frontend)
- Evaluation metrics: Request count, response times, error rates
- Log aggregation: Structured JSON logging for analysis
- Performance monitoring: Built-in Vercel Analytics support

## Technical Architecture

### Security Implementation Pipeline
1. **Request Ingestion**: Parse and validate incoming simulation requests
2. **IP Validation**: CIDR-based allow/block list evaluation
3. **Authentication**: JWT signature verification and claims validation
4. **Authorization**: OAuth2 scope checking and permission validation
5. **Rate Limiting**: Sliding window threshold enforcement
6. **Header/Path Matching**: Custom rule evaluation with regex support
7. **Decision Rendering**: Detailed response with evaluation reasoning

### Key Security Features
- **Zero Trust Architecture**: Default deny with explicit allow rules
- **Defense in Depth**: Multiple validation layers with fail-safe defaults
- **Audit Compliance**: Complete request/response logging with immutable trails
- **Performance Optimized**: Sub-millisecond rule evaluation with caching

### Enterprise Integration
- **REST API**: Complete programmatic access for automation
- **Export Capabilities**: Rule sets and logs in JSON/CSV formats
- **Webhook Support**: Real-time notifications for security events
- **SSO Integration**: JWT-based authentication with enterprise identity providers 