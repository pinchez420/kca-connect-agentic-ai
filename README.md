# KCA Connect Agentic AI

An intelligent AI-powered chat interface for KCA University students and staff to access information about timetables, fees, exams, and more through natural language conversations.

## ✨ Features

- 🤖 **Smart RAG System**: Retrieval-Augmented Generation using LangChain and Qdrant
- 🎨 **Modern UI**: Beautiful gradient design with glassmorphism effects
- 💬 **Conversational Interface**: Natural language Q&A powered by Google Gemini
- 📚 **Document Knowledge Base**: Automatically ingests and processes PDF documents
- 🔍 **Semantic Search**: Intelligent document retrieval using HuggingFace embeddings
- ⚡ **Real-time Responses**: Fast, context-aware answers
- 🎯 **Health Monitoring**: Built-in health checks for all services

## 🏗️ Project Structure

```
.
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # FastAPI + LangChain + RAG
├── docker-compose.yml # Service orchestration
├── SDS.pdf           # System Design Specification (for ingestion)
├── SRS.pdf           # Software Requirements Specification (for ingestion)
└── Proposal.pdf      # Project proposal (for ingestion)
```

## 🔧 Prerequisites

- **Docker** and **Docker Compose**
- **Node.js** (v18+) - for local frontend development
- **Python** (v3.11+) - for local backend development
- **Google API Key** - for Gemini LLM integration

## 🚀 Quick Start

### 1. Get Your Google API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key for the next step

### 2. Configure Environment Variables

```bash
cd backend
cp .env.example .env
# Edit .env and add your Google API key
nano .env  # or use your preferred editor
```

Update the `.env` file:
```bash
QDRANT_URL=http://localhost:6333
COLLECTION_NAME=kca_documents
EMBEDDING_MODEL=all-MiniLM-L6-v2
GOOGLE_API_KEY=your_actual_api_key_here  # Replace this!
```

### 3. Run with Docker (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d
```

This will start:
- Frontend on http://localhost:5173
- Backend API on http://localhost:8000
- Qdrant vector database on http://localhost:6333

### 4. Ingest Documents

Once the services are running, ingest the PDF documents:

```bash
cd backend
python ingest.py
```

This will:
- Load all PDF files from the project root
- Split them into chunks
- Generate embeddings
- Store them in Qdrant for semantic search

## 💻 Local Development

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:5173

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```

The backend API will be available at http://localhost:8000

## 📡 API Endpoints

- `GET /` - Service status
- `GET /health` - Detailed health check (Qdrant, LLM, collections)
- `GET /docs` - Interactive API documentation (Swagger UI)
- `POST /chat` - Chat endpoint
  ```json
  {
    "message": "What are the exam dates?"
  }
  ```

## 🎯 Usage

1. **Access the Application**: Open http://localhost:5173
2. **Ask Questions**: Type your question about KCA University
   - "What are the tuition fees?"
   - "When are the exams scheduled?"
   - "Show me the course timetable"
3. **Get AI Responses**: The system will:
   - Search relevant documents
   - Use context to generate accurate answers
   - Cite information from the knowledge base

## 🔍 Architecture

```
User Query → Frontend (React)
    ↓
FastAPI Backend
    ↓
RAG Pipeline:
  1. Query Embedding (HuggingFace)
  2. Vector Search (Qdrant)
  3. Context Retrieval
  4. LLM Generation (Google Gemini)
    ↓
Response → Frontend → User
```

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Modern glassmorphism design

### Backend
- FastAPI
- LangChain
- Google Gemini 1.5 Flash
- HuggingFace Embeddings
- Qdrant Vector Database
- PyPDF2 for document processing

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QDRANT_URL` | Qdrant database URL | `http://localhost:6333` |
| `COLLECTION_NAME` | Vector collection name | `kca_documents` |
| `EMBEDDING_MODEL` | HuggingFace model | `all-MiniLM-L6-v2` |
| `GOOGLE_API_KEY` | Google Gemini API key | *(required)* |

## 🐛 Troubleshooting

### Backend won't start
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check if `.env` file exists with proper API key
- Verify Qdrant is running: `docker ps`

### No responses from the chat
- Check if documents are ingested: `python ingest.py`
- Verify health endpoint: http://localhost:8000/health
- Check backend logs for errors

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check CORS settings in `main.py`
- Verify API_URL in `frontend/src/services/api.js`

## 📚 Adding More Documents

To add more documents to the knowledge base:

1. Place PDF files in the project root directory
2. Run the ingestion script:
   ```bash
   cd backend
   python ingest.py
   ```

## 🤝 Contributing

This project is part of a final year university project. Feel free to suggest improvements!

## 📄 License

Educational project for KCA University

---

**Made with ❤️ for KCA University**
