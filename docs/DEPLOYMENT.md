# Deployment Guide

This guide covers various deployment options for the ZeroPass Firewall Simulator.

## 🌐 Vercel Deployment (Recommended)

### Frontend Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables** in Vercel Dashboard:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
   ```

### Backend Deployment Options

#### Option 1: Railway (Recommended)
1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Deploy the `backend` folder
4. Set environment variables:
   ```
   PORT=8000
   CORS_ORIGINS=https://your-frontend-url.vercel.app
   ```

#### Option 2: Render
1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect repository and set:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `backend`

#### Option 3: Heroku
1. Install Heroku CLI
2. Create `Procfile` in backend directory:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
3. Deploy:
   ```bash
   cd backend
   heroku create your-app-name
   git subtree push --prefix backend heroku main
   ```

## 🐳 Docker Deployment

### Local Development
```bash
# Build and run with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

### Production Docker
```bash
# Build images
docker build -t zeropass-frontend --target frontend .
docker build -t zeropass-backend --target backend .

# Run containers
docker run -d -p 3000:3000 --name frontend zeropass-frontend
docker run -d -p 8000:8000 --name backend zeropass-backend
```

## ☁️ Cloud Platform Deployments

### AWS Deployment

#### Frontend (S3 + CloudFront)
1. Build the application:
   ```bash
   npm run build
   npm run export
   ```
2. Upload `out/` folder to S3 bucket
3. Configure CloudFront distribution
4. Set custom domain and SSL certificate

#### Backend (AWS Lambda)
1. Install serverless framework:
   ```bash
   npm install -g serverless
   ```
2. Create `serverless.yml`:
   ```yaml
   service: zeropass-backend
   provider:
     name: aws
     runtime: python3.9
   functions:
     api:
       handler: main.handler
       events:
         - http:
             path: /{proxy+}
             method: ANY
   ```

### Google Cloud Platform

#### Frontend (Firebase Hosting)
```bash
npm install -g firebase-tools
firebase init hosting
npm run build
firebase deploy
```

#### Backend (Cloud Run)
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/zeropass-backend backend/
gcloud run deploy --image gcr.io/PROJECT-ID/zeropass-backend --platform managed
```

### Azure Deployment

#### Frontend (Static Web Apps)
1. Create Azure Static Web App
2. Connect GitHub repository
3. Set build configuration:
   ```yaml
   app_location: "/"
   api_location: "backend"
   output_location: ".next"
   ```

## 🔧 Environment Configuration

### Production Environment Variables

#### Frontend (.env.production)
```bash
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_APP_ENV=production
```

#### Backend
```bash
# CORS Configuration
CORS_ORIGINS=https://your-frontend-url.com,https://your-domain.com

# Optional: Database URL (if using persistent storage)
DATABASE_URL=postgresql://user:pass@host:port/db

# Optional: Redis URL (for scalable rate limiting)
REDIS_URL=redis://user:pass@host:port

# Optional: JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Optional: Logging
LOG_LEVEL=INFO
```

## 🔒 Security Considerations

### Production Checklist

- [ ] Set proper CORS origins (not `*`)
- [ ] Use HTTPS for all communications
- [ ] Set secure JWT secrets
- [ ] Enable rate limiting
- [ ] Configure proper firewall rules
- [ ] Use environment variables for secrets
- [ ] Enable logging and monitoring
- [ ] Set up backup strategies
- [ ] Configure SSL certificates
- [ ] Use CDN for static assets

### SSL/TLS Configuration

Most cloud platforms provide automatic SSL certificates. For custom deployments:

1. **Let's Encrypt** (Free):
   ```bash
   certbot --nginx -d your-domain.com
   ```

2. **Cloudflare** (Free tier available):
   - Add domain to Cloudflare
   - Enable SSL/TLS encryption
   - Configure DNS records

## 📊 Monitoring and Logging

### Application Monitoring

1. **Vercel Analytics** (Frontend):
   - Enable in Vercel dashboard
   - Monitor performance and usage

2. **Sentry** (Error Tracking):
   ```bash
   npm install @sentry/nextjs @sentry/python
   ```

3. **Custom Logging**:
   ```python
   # Backend logging configuration
   import logging
   logging.basicConfig(
       level=logging.INFO,
       format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
   )
   ```

### Health Checks

The backend includes health check endpoints:
- `GET /health` - Basic health status
- `GET /` - API status and information

## 🚀 Performance Optimization

### Frontend Optimization

1. **Next.js Optimization**:
   ```javascript
   // next.config.js
   module.exports = {
     images: {
       domains: ['your-domain.com'],
     },
     compress: true,
     poweredByHeader: false,
   }
   ```

2. **Bundle Analysis**:
   ```bash
   npm install @next/bundle-analyzer
   ANALYZE=true npm run build
   ```

### Backend Optimization

1. **Uvicorn Configuration**:
   ```bash
   uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
   ```

2. **Redis Caching**:
   ```python
   # Add Redis for rate limiting and caching
   import redis
   redis_client = redis.from_url(os.getenv('REDIS_URL'))
   ```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - run: pip install -r backend/requirements.txt
      - run: python -m pytest backend/tests/
      # Add your backend deployment steps here
```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check `CORS_ORIGINS` environment variable
   - Ensure frontend URL is included in backend CORS settings

2. **Environment Variables Not Loading**:
   - Verify `.env.local` file exists
   - Check Vercel environment variable settings
   - Restart development server

3. **Build Failures**:
   - Clear `.next` and `node_modules` directories
   - Run `npm install` again
   - Check for TypeScript errors

4. **Backend Connection Issues**:
   - Verify backend URL in environment variables
   - Check if backend server is running
   - Verify network connectivity

### Debug Commands

```bash
# Check environment variables
npm run env

# Analyze bundle size
npm run analyze

# Check backend health
curl http://localhost:8000/health

# View backend logs
docker logs backend-container-name
```

---

For additional support, please refer to the main README.md or create an issue in the repository. 