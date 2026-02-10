from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from app.services.rag_service import rag_service
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="KCA Connect Agentic AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.get("/")
def read_root():
    return {
        "status": "online", 
        "service": "KCA Connect Agentic AI",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    """Health check endpoint to verify service status"""
    try:
        # Check Qdrant connection
        collections = rag_service.client.get_collections()
        qdrant_status = "connected"
        collection_exists = settings.COLLECTION_NAME in [c.name for c in collections.collections]
    except Exception as e:
        logger.error(f"Qdrant health check failed: {e}")
        qdrant_status = "disconnected"
        collection_exists = False
    
    return {
        "status": "healthy",
        "qdrant": qdrant_status,
        "collection_exists": collection_exists,
        "collection_name": settings.COLLECTION_NAME,
        "llm_configured": bool(settings.GOOGLE_API_KEY)
    }

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """Chat endpoint for RAG-based Q&A"""
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        logger.info(f"Received query: {request.message[:100]}...")
        answer = rag_service.get_answer(request.message)
        logger.info("Successfully generated response")
        
        return ChatResponse(response=answer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred while processing your request: {str(e)}"
        )
