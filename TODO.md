# Netlify + Render Deployment Setup

## Steps to Complete

### 1. Frontend Configuration for Netlify
- [x] Update `frontend/src/services/api.js` to use environment variables
- [x] Create `frontend/netlify.toml` for build configuration
- [x] Create `frontend/.env.example` for environment variable documentation

### 2. Backend Configuration for Render
- [x] Create `backend/render.yaml` for Render deployment
- [x] Update `backend/main.py` CORS to allow Netlify domain
- [x] Create `backend/.env.example` for environment variables
- [x] Update `backend/app/core/config.py` to add QDRANT_API_KEY support
- [x] Update `backend/app/services/qdrant_service.py` to support Qdrant Cloud

### 3. Qdrant Cloud Setup
- [x] Sign up for Qdrant Cloud (https://cloud.qdrant.io/)
- [x] Create a cluster (free tier available)
- [x] Get API endpoint and API key
- [ ] Update backend environment variables on Render (QDRANT_API_KEY acquired)

### 4. Deployment Steps
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Netlify
- [ ] Configure environment variables on both platforms
- [ ] Test streaming chat functionality
- [ ] Ingest documents to Qdrant Cloud

### 5. Post-Deployment
- [ ] Update Supabase auth redirect URLs
- [ ] Test end-to-end functionality
- [ ] Document live URLs
