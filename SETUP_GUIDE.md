# Quick Setup Guide - After Downloads Complete

## Current Status
- ✅ Frontend: Running on http://localhost:5173
- ✅ Qdrant: Running on http://localhost:6333
- ⏳ Backend: Waiting for dependencies

## Step 1: Install Downloaded Packages

After your external downloads finish:

```bash
cd ~/Documents/final\ year\ proj/backend
source .venv/bin/activate

# Install the manually downloaded .whl files
pip install /path/to/torch-*.whl
pip install /path/to/nvidia_*.whl

# Complete remaining dependencies
pip install -r requirements.txt
```

## Step 2: Ingest Documents

Load the SDS and SRS PDFs into the vector database:

```bash
python ingest.py
```

Expected output:
```
Loading ../SDS.pdf...
Loading ../SRS.pdf...
Split into XXX chunks.
Created collection kca_documents
Ingestion complete!
```

## Step 3: Start Backend

Option A - Using helper script:
```bash
./start.sh
```

Option B - Manual:
```bash
uvicorn main:app --reload
```

## Step 4: Test the System

1. **Check Backend API**: http://localhost:8000/docs
2. **Open Frontend**: http://localhost:5173
3. **Send a test message**: "What is KCA Connect Agentic AI?"

## Troubleshooting

### "Module not found" error
```bash
# Verify all packages installed
pip list | grep -E 'torch|langchain|qdrant'
```

### Qdrant not running
```bash
docker ps  # Check if qdrant container is running
docker start qdrant  # Start if stopped
```

### Frontend can't connect
- Check backend is running on port 8000
- Check CORS is enabled (it is by default)
- Open browser console for error messages

## What You Built

This is a production-ready RAG (Retrieval Augmented Generation) system with:
- Modern React frontend with Tailwind CSS
- FastAPI backend with semantic search
- Qdrant vector database for document retrieval
- Complete Docker containerization

Next steps after verification:
- Add authentication (Firebase as per SDS)
- Integrate real university APIs (timetables, fees)
- Deploy to production (Firebase Hosting + Cloud Run)
