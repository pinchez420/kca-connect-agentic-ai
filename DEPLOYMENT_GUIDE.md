# Netlify + Render Deployment Guide

This guide will walk you through deploying your KCA Connect Agentic AI application using **Netlify** for the frontend and **Render** for the backend.

## Architecture Overview

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Netlify       │      │   Render         │      │   Qdrant Cloud  │
│   (Frontend)    │──────▶│   (Backend API)  │──────▶│   (Vector DB)   │
│   React + Vite  │      │   FastAPI        │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Supabase      │
                       │   (Auth + DB)   │
                       └──────────────────┘
```

## Prerequisites

- [ ] GitHub account (for code repository)
- [ ] Netlify account (free tier available)
- [ ] Render account (free tier available)
- [ ] Qdrant Cloud account (free tier available)
- [ ] Supabase project already set up
- [ ] Google API Key (for Gemini LLM) or Cerebras API Key

---

## Step 1: Set Up Qdrant Cloud (Vector Database)

1. Go to [https://cloud.qdrant.io/](https://cloud.qdrant.io/) and sign up
2. Create a new cluster:
   - Choose the free tier (1 node, 1 GB RAM)
   - Select a region close to your users
   - Wait for the cluster to be ready (2-3 minutes)
3. Get your credentials:
   - **Qdrant URL**: `https://your-cluster.cloud.qdrant.io:6333`
   - **API Key**: Found in "Access" tab → "Create API Key"

---

## Step 2: Deploy Backend to Render

### 2.1 Push Code to GitHub

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for deployment: Netlify + Render setup"
git push origin main
```

### 2.2 Create Render Account & Deploy

1. Go to [https://render.com/](https://render.com/) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `kca-connect-api` (or your preferred name)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or Standard for better performance)

5. Add Environment Variables:
   ```
   QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
   QDRANT_API_KEY=your_qdrant_api_key_here
   GOOGLE_API_KEY=your_google_api_key_here
   CEREBRAS_API_KEY=your_cerebras_api_key_here (optional)
   DEFAULT_LLM=gemini
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ALLOWED_ORIGINS=https://your-netlify-app.netlify.app
   ```

6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Note your Render URL: `https://kca-connect-api.onrender.com`

### 2.3 Test Backend Deployment

Visit these URLs to verify:
- `https://your-render-url.onrender.com/` - Should show status
- `https://your-render-url.onrender.com/health` - Should show healthy status

---

## Step 3: Deploy Frontend to Netlify

### 3.1 Prepare Frontend

1. Create a `.env` file in the `frontend` directory:

```bash
cd frontend
```

Create `frontend/.env`:
```env
VITE_API_URL=https://your-render-url.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3.2 Deploy to Netlify

**Option A: Via Netlify UI (Easiest)**

1. Go to [https://app.netlify.com/](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click "Show advanced" → "New variable" and add:
   - `VITE_API_URL`: `https://your-render-url.onrender.com`
   - `VITE_SUPABASE_URL`: `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `your_supabase_anon_key_here`
6. Click "Deploy site"

**Option B: Via Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
cd frontend
netlify init
netlify deploy --prod --build
```

### 3.3 Update Render CORS

After getting your Netlify URL, update the `ALLOWED_ORIGINS` environment variable in Render:

```
ALLOWED_ORIGINS=https://your-netlify-app.netlify.app
```

---

## Step 4: Update Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to Authentication → URL Configuration
3. Update Site URL to your Netlify URL:
   - `https://your-netlify-app.netlify.app`
4. Add Redirect URLs:
   - `https://your-netlify-app.netlify.app/auth/callback`
   - `https://your-netlify-app.netlify.app/`

---

## Step 5: Ingest Documents to Qdrant Cloud

Your documents need to be in the cloud Qdrant instance. You have two options:

### Option A: Local Ingestion (One-time)

1. Update your local `.env` to point to Qdrant Cloud temporarily
2. Run the ingest script:
   ```bash
   cd backend
   python ingest.py
   ```
3. Switch back to local Qdrant for development

### Option B: Render Ingestion (Recommended)

1. SSH into your Render service (requires paid plan) OR
2. Create a one-time job in Render dashboard
3. Run the ingest command with your PDFs uploaded to the service

---

## Step 6: Verify Deployment

### Test Checklist

- [ ] Frontend loads without errors
- [ ] Can sign in via Supabase auth
- [ ] Can send a chat message
- [ ] Streaming responses work
- [ ] No CORS errors in browser console
- [ ] Backend health check passes

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| CORS errors | Update `ALLOWED_ORIGINS` in Render with exact Netlify URL |
| 502 Bad Gateway | Check Render logs; likely missing env variables |
| Streaming not working | Ensure Render plan supports long-running connections |
| Auth not working | Verify Supabase URL and anon key in Netlify env vars |
| "No documents found" | Run ingest script to populate Qdrant Cloud |

---

## Environment Variables Reference

### Frontend (Netlify)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://kca-connect-api.onrender.com` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key | `eyJhbG...` |

### Backend (Render)
| Variable | Description | Example |
|----------|-------------|---------|
| `QDRANT_URL` | Qdrant Cloud endpoint | `https://cluster.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | Qdrant Cloud API key | `your-api-key` |
| `GOOGLE_API_KEY` | Google Gemini API key | `AIzaSyB...` |
| `SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase service role key | `eyJhbG...` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://app.netlify.app` |

---

## Post-Deployment: Custom Domain (Optional)

### Netlify Custom Domain
1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow DNS configuration instructions

### Render Custom Domain
1. Go to your web service settings
2. Click "Custom Domains"
3. Add your domain and configure DNS

---

## Monitoring & Maintenance

- **Render Dashboard**: Monitor backend logs and performance
- **Netlify Analytics**: Track frontend traffic (enable in site settings)
- **Qdrant Cloud Console**: Monitor vector database usage
- **Supabase Dashboard**: Monitor auth and database activity

---

## Cost Estimation (Monthly)

| Service | Free Tier | Paid (Recommended) |
|---------|-----------|-------------------|
| Netlify | 100GB bandwidth | Pro: $19/month |
| Render | 750 hours, 512MB RAM | Standard: $7/month |
| Qdrant Cloud | 1GB RAM, 1 node | Small: $7/month |
| Supabase | 500MB DB, 2GB bandwidth | Pro: $25/month |
| **Total** | **$0** | **~$58/month** |

---

## Support & Troubleshooting

- **Render Docs**: https://render.com/docs
- **Netlify Docs**: https://docs.netlify.com/
- **Qdrant Cloud Docs**: https://qdrant.tech/documentation/cloud/
- **Supabase Docs**: https://supabase.com/docs

---

## Quick Commands Reference

```bash
# Local development
cd frontend && npm run dev          # Start frontend
cd backend && uvicorn main:app --reload  # Start backend

# Deploy updates
git add . && git commit -m "Update" && git push  # Auto-deploys to Render & Netlify

# Check logs
render logs --tail  # Render CLI (if installed)
```

---

**Your application is now ready for production! 🚀**
