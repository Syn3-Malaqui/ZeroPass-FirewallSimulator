# ZeroPass Firewall Simulator Deployment Guide

This guide provides instructions for deploying the ZeroPass Firewall Simulator with the backend on Render and the frontend on Vercel.

## Backend Deployment (Render)

1. **Create a Render account** at [render.com](https://render.com)

2. **Deploy via Dashboard**
   - Log into your Render dashboard
   - Click "New" and select "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - Name: `zeropass-backend`
     - Root Directory: `backend` (or leave blank and use build command below)
     - Runtime: `Python 3`
     - Build Command: `pip install -r backend/requirements.txt`
     - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2`
   - Add environment variables:
     - `CORS_ORIGINS`: `https://zeropass-firewall-simulator.vercel.app,https://*.vercel.app`
   - Click "Create Web Service"

3. **Alternatively, use render.yaml**
   - Render will automatically detect the `render.yaml` file in your repository
   - Create a Blueprint deployment from the Dashboard
   - Select your repository and Deploy

4. **Verify Backend Deployment**
   - Once deployed, note the URL (e.g., `https://zeropass-backend.onrender.com`)
   - Test the endpoint by visiting `https://your-backend-url.onrender.com/health`
   - You should see a response like: `{"message":"ZeroPass Firewall Simulator API","status":"running"}`

## Frontend Deployment (Vercel)

1. **Create a Vercel account** at [vercel.com](https://vercel.com)

2. **Deploy from Dashboard**
   - Log into your Vercel dashboard
   - Click "Add New" and select "Project"
   - Import your GitHub repository
   - Configure the project:
     - Root Directory: `frontend` (or leave blank if you're using the root vercel.json)
     - Framework Preset: `Next.js`
   - Override settings if needed:
     - Build Command: `cd frontend && npm install && npm run build`
     - Output Directory: `frontend/.next`
   - Add environment variables:
     - `NEXT_PUBLIC_BACKEND_URL`: `https://zeropass-backend.onrender.com`
   - Click "Deploy"

3. **Verify Frontend Deployment**
   - Once deployed, note the URL (e.g., `https://zeropass-firewall-simulator.vercel.app`)
   - Test the application by visiting the URL
   - Ensure the frontend can communicate with the backend

## Troubleshooting

### CORS Issues

If you encounter CORS issues:

1. **Verify CORS settings** in `backend/main.py` 
   - Currently set to allow all origins with `allow_origins=["*"]`
   - For production, you might want to restrict this to specific domains

2. **Check environment variables** on Render
   - Ensure `CORS_ORIGINS` includes your Vercel domain

3. **Test with browser dev tools**
   - Open developer console (F12) and look for CORS-related errors
   - Verify network requests are going to the correct backend URL

### API Connection Issues

If the frontend cannot connect to the backend:

1. **Check environment variables** on Vercel
   - Ensure `NEXT_PUBLIC_BACKEND_URL` is set correctly

2. **Verify API configuration** in `frontend/lib/api.ts`
   - The `getBackendUrl()` function should return the correct URL

3. **Test backend directly**
   - Try accessing `https://your-backend-url.onrender.com/health`
   - Verify the backend is running and accessible

## IP Addresses

The following IP addresses have been identified for use with Render services:

- 52.41.36.82
- 54.191.253.12
- 44.226.122.3

If you need to whitelist these IPs in any firewall or security group settings, these are the addresses to use. 