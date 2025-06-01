# ZeroPass Firewall Simulator Deployment Guide

This document provides step-by-step instructions for deploying the ZeroPass Firewall Simulator with the backend on Render and the frontend on Vercel.

## Prerequisites

Before you begin, make sure you have:

- A GitHub account with this repository forked or pushed to it
- A [Render](https://render.com) account (free tier is sufficient)
- A [Vercel](https://vercel.com) account (free tier is sufficient)

## Step 1: Deploy Backend to Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. Click on the "New +" button and select "Web Service"
3. Connect your GitHub repository or use the public GitHub repository URL
4. Configure the service:
   - **Name**: `zeropass-backend` (or your preferred name)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under "Advanced" settings, add the following environment variable:
   - **Key**: `CORS_ORIGINS`
   - **Value**: `https://your-vercel-app.vercel.app` (replace with your Vercel domain, or add multiple origins separated by commas)
6. Click "Create Web Service"
7. Wait for the deployment to complete (this may take a few minutes)
8. Note the URL provided by Render (e.g., `https://zeropass-backend.onrender.com`)
9. Test the backend by visiting `https://zeropass-backend.onrender.com/health`

## Step 2: Deploy Frontend to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." and select "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend` (important: select the frontend directory)
5. Expand the "Environment Variables" section and add:
   - **Name**: `NEXT_PUBLIC_BACKEND_URL`
   - **Value**: The URL of your Render backend (e.g., `https://zeropass-backend.onrender.com`)
6. Click "Deploy"
7. Wait for the deployment to complete (this should be quick)
8. Vercel will provide a URL for your deployed frontend (e.g., `https://zeropass-firewall-simulator.vercel.app`)

## Step 3: Verify the Deployment

1. Open your deployed frontend URL in a browser
2. Check that the application loads properly
3. Try creating a new rule set
4. Test the API simulator to make sure it can communicate with the backend
5. If you encounter any issues, check the Troubleshooting section below

## Using Custom Domains (Optional)

### Vercel Custom Domain
1. In your Vercel project dashboard, go to "Settings" > "Domains"
2. Add your domain and follow the instructions to configure DNS

### Render Custom Domain
1. In your Render dashboard, select your web service
2. Go to "Settings" > "Custom Domain"
3. Add your domain and follow the instructions to configure DNS
4. **Important**: If you use a custom domain, remember to update the `CORS_ORIGINS` environment variable in your Render backend and `NEXT_PUBLIC_BACKEND_URL` in your Vercel frontend

## Troubleshooting

### CORS Issues
If you're seeing CORS errors in the browser console:
1. Make sure the `CORS_ORIGINS` environment variable in Render includes your Vercel domain
2. If you've added a custom domain, update this variable to include it
3. Redeploy the backend after making changes

### Connection Issues
If the frontend cannot connect to the backend:
1. Check that the `NEXT_PUBLIC_BACKEND_URL` is correctly set in Vercel
2. Ensure the backend is running properly by testing the health endpoint
3. Check network requests in the browser developer tools for specific errors

### Deployment Failures
If deployment fails:
1. Check the deployment logs in Render or Vercel
2. Ensure all dependencies are correctly listed in `requirements.txt` and `package.json`
3. Make sure the correct root directories are selected (backend for Render, frontend for Vercel)

## Continuous Deployment

Both Render and Vercel will automatically redeploy your application when you push changes to your GitHub repository. This makes it easy to keep your application up to date. 