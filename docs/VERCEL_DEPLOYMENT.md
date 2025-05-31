# Vercel Deployment Guide for ZeroPass

This guide provides detailed instructions for deploying the ZeroPass Firewall Simulator to Vercel, specifically addressing common issues like the "Function Runtimes must have a valid version" error.

## Architecture Overview

ZeroPass has a split architecture:
- **Frontend**: Next.js app deployed to Vercel
- **Backend**: FastAPI Python app deployed to a separate service (Railway, Render, Heroku, etc.)

## Step 1: Deploy the Backend First

The backend must be deployed separately from Vercel, as Vercel has limited support for Python runtimes.

### Recommended Backend Platforms:

1. **Railway**
   ```bash
   # Connect GitHub repository to Railway
   # Deploy backend folder as a service
   # Set the following environment variables:
   PORT=8000
   CORS_ORIGINS=https://your-vercel-domain.vercel.app
   ```

2. **Render**
   ```bash
   # Create new Web Service on Render
   # Build Command: pip install -r requirements.txt
   # Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   # Root Directory: backend
   ```

3. **Heroku**
   ```bash
   # Add Procfile to backend directory:
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   
   # Deploy
   git subtree push --prefix backend heroku main
   ```

## Step 2: Prepare Your Frontend for Vercel

1. **Update Environment Variables**
   
   After deploying your backend, take note of the URL. You'll need to add this to your Vercel deployment.

2. **Verify Configuration Files**
   
   Ensure your `vercel.json` and `next.config.js` are properly configured as shown in this repository.

## Step 3: Deploy to Vercel

### Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Log in to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. During deployment, you'll be prompted to set environment variables. Add:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
   ```

### Option 2: Using Vercel Dashboard

1. Push your repository to GitHub
2. Connect your GitHub repository to Vercel
3. Configure build settings:
   - Framework: Next.js
   - Root Directory: ./
4. Add Environment Variables:
   - Name: `NEXT_PUBLIC_BACKEND_URL`
   - Value: `https://your-backend-url.com`
5. Deploy

## Troubleshooting Common Errors

### "Function Runtimes must have a valid version" Error

This error occurs when Vercel tries to use a Python runtime for API routes. Our solution:

1. **Do not use Vercel for Python functions** - deploy the backend separately
2. **Use API forwarding** - configure rewrites in vercel.json and next.config.js to forward API requests
3. **Remove runtime specifications** - ensure vercel.json doesn't include Python runtimes

### CORS Issues

If you encounter CORS errors after deployment:

1. Verify that your backend has CORS properly configured:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-vercel-domain.vercel.app"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. Check that your `NEXT_PUBLIC_BACKEND_URL` is correct in Vercel

### API Routes Not Working

If API routes are not connecting to your backend:

1. Verify your rewrites in `next.config.js` and `vercel.json`
2. Check network requests in browser console for specific errors
3. Ensure your backend is running and accessible

## Vercel Deployment Limitations

Vercel has some limitations for Python applications:

1. **Limited Python Support**: Vercel's Python runtime is primarily designed for serverless functions, not full FastAPI applications
2. **Cold Starts**: Serverless functions have cold start times that may affect performance
3. **Execution Time Limits**: Vercel has a maximum execution time for serverless functions

This is why we recommend a separate backend deployment on a platform better suited for Python web applications.

## Best Practices

1. **Environment Variables**: Never hardcode URLs or sensitive information
2. **Monitoring**: Set up monitoring for both your Vercel frontend and backend service
3. **CI/CD**: Configure GitHub Actions for testing before deployment
4. **Regular Updates**: Keep dependencies updated for security
5. **Domain Setup**: Consider setting up a custom domain for both frontend and backend

By following this deployment architecture, you can successfully run ZeroPass with the frontend on Vercel and the backend on a more Python-friendly platform. 