# 🚀 KCA Connect AI - Quick Reference

## Essential Commands

### Setup & Start
```bash
# First time setup
./setup.sh

# Quick start (after setup)
./start.sh

# Manual Docker start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Development

**Backend:**
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Document Ingestion
```bash
cd backend
python ingest.py
```

## Access URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
| Qdrant Dashboard | http://localhost:6333/dashboard |

## Environment Setup

### Required: Google API Key
1. Get key: https://makersuite.google.com/app/apikey
2. Edit `backend/.env`
3. Set: `GOOGLE_API_KEY=your_key_here`

## Testing

### Health Check
```bash
curl http://localhost:8000/health
```

### Test Chat
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is KCA University?"}'
```

## Troubleshooting

### Services won't start
```bash
# Check Docker
docker ps

# Rebuild
docker-compose down
docker-compose up --build
```

### Backend errors
```bash
# Check logs
docker-compose logs backend

# Verify environment
cat backend/.env
```

### No responses from chat
```bash
# 1. Check if documents are ingested
curl http://localhost:8000/health

# 2. Re-ingest if needed
cd backend && python ingest.py
```

## Project Structure
```
.
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/    # ChatInterface.jsx
│   │   └── services/      # api.js
│   └── package.json
│
├── backend/               # FastAPI + LangChain
│   ├── app/
│   │   ├── core/         # config.py
│   │   └── services/     # rag_service.py
│   ├── main.py           # API endpoints
│   ├── ingest.py         # Document loader
│   └── requirements.txt
│
├── docker-compose.yml     # Service orchestration
├── setup.sh              # Automated setup
└── start.sh              # Quick start

```

## Next Steps After PyTorch Install

1. **Install dependencies:**
   ```bash
   cd backend
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure API key:**
   ```bash
   nano backend/.env
   # Add: GOOGLE_API_KEY=your_actual_key
   ```

3. **Ingest documents:**
   ```bash
   python ingest.py
   ```

4. **Test the app:**
   - Open http://localhost:5173
   - Ask: "What is KCA University?"

## Features

✅ Smart RAG with Google Gemini  
✅ Beautiful modern UI  
✅ Real-time chat interface  
✅ Document knowledge base  
✅ Semantic search  
✅ Health monitoring  

---

**Need help?** Check the full [README.md](file:///home/wizo/Documents/final%20year%20proj/README.md) or [walkthrough.md](file:///home/wizo/.gemini/antigravity/brain/5847edca-d90e-4b85-a341-0bccdbde9ab9/walkthrough.md)
