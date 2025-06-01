# ZeroPass Firewall Simulator Deployment Guide

This guide provides step-by-step instructions for deploying the ZeroPass Firewall Simulator with the backend on Render and the frontend on Vercel.

## Prerequisites

- [GitHub](https://github.com/) account
- [Vercel](https://vercel.com/) account
- [Render](https://render.com/) account

## Backend Deployment on Render

1. **Fork or push this repository to your GitHub account**

2. **Connect to Render**:
   - Sign in to your Render account
   - Click "New" and select "Blueprint"
   - Connect your GitHub account and select this repository
   - Render will automatically detect the `render.yaml` configuration file
   - Click "Apply Blueprint"

3. **Manual Setup (Alternative)**:
   - Sign in to your Render account
   - Click "New" and select "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - Name: `zeropass-backend`
     - Root Directory: `backend`
     - Runtime: `Python 3`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Add the environment variables:
     - `CORS_ORIGINS`: Set to your Vercel frontend URL (e.g., `https://zeropass-firewall-simulator.vercel.app`)
   - Click "Create Web Service"

4. **Verify Deployment**:
   - Wait for the build and deployment to complete
   - Navigate to the provided Render URL (e.g., `https://zeropass-backend.onrender.com`)
   - You should see a "Welcome to ZeroPass Firewall Simulator API" message
   - Test the API health endpoint: `https://zeropass-backend.onrender.com/api/health`

## Frontend Deployment on Vercel

1. **Connect to Vercel**:
   - Sign in to your Vercel account
   - Click "Add New" and select "Project"
   - Import your GitHub repository
   - Configure the project:
     - Framework Preset: `Next.js`
     - Root Directory: `frontend`

2. **Configure Environment Variables**:
   - Add the following environment variable:
     - `NEXT_PUBLIC_BACKEND_URL`: Set to your Render backend URL (e.g., `https://zeropass-backend.onrender.com`)

3. **Deploy**:
   - Click "Deploy"
   - Wait for the build and deployment to complete
   - Vercel will provide a URL for your deployed frontend (e.g., `https://zeropass-firewall-simulator.vercel.app`)

4. **Verify Deployment**:
   - Navigate to the provided Vercel URL
   - Ensure the frontend can communicate with the backend
   - Test the rule builder and simulator functionality

## Linking Frontend and Backend

Ensure that the following configuration is correct:

1. **Frontend Environment Variable**:
   - `NEXT_PUBLIC_BACKEND_URL` should point to your Render backend URL

2. **Backend Environment Variable**:
   - `CORS_ORIGINS` should include your Vercel frontend URL

## Troubleshooting

### CORS Issues
If you experience CORS issues:
1. Verify that the `CORS_ORIGINS` environment variable on Render is correctly set to your Vercel domain
2. Check the browser console for specific CORS error messages
3. Ensure the backend is properly configured to handle CORS requests

### API Connection Issues
If the frontend cannot connect to the backend:
1. Verify the `NEXT_PUBLIC_BACKEND_URL` environment variable is correctly set in Vercel
2. Check that the backend is running properly on Render
3. Test the backend API endpoints directly using a tool like Postman

### Deployment Failures
If deployment fails:
1. Check the build logs on the respective platform
2. Ensure all dependencies are properly specified in `package.json` and `requirements.txt`
3. Verify that the Node.js and Python versions are compatible with your code

## Continuous Deployment

Both Vercel and Render support continuous deployment:
- Any push to the main branch will trigger a new deployment
- You can configure branch deployments for testing changes before merging to main

## Custom Domains

To use custom domains:
1. In Vercel, go to Project Settings → Domains to add and configure your custom domain
2. In Render, go to your Web Service → Settings → Custom Domain to add your domain

## Support

If you encounter any issues with deployment, please:
1. Check the platform-specific documentation:
   - [Vercel Documentation](https://vercel.com/docs)
   - [Render Documentation](https://render.com/docs)
2. Open an issue in the GitHub repository 