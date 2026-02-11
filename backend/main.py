import os
import json
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.services.rag_service import rag_service
from app.services.web_search_service import web_search_service
from app.core.config import settings
from supabase import create_client, Client
import logging
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

app = FastAPI(title="KCA Connect Agentic AI")

# Configure CORS - use environment variable for production, allow all for development
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",") if os.getenv("ALLOWED_ORIGINS") else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_current_user(authorization: str = Header(None)):
    """Dependency to verify Supabase JWT token"""
    if not authorization:
        logger.warning("Authorization header missing")
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        # Expected format: "Bearer <token>"
        token = authorization.split(" ")[1] if " " in authorization else authorization
        logger.info(f"Verifying token: {token[:10]}...")
        
        # Verify with Supabase
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            logger.warning("Invalid or expired token")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        logger.info(f"User authenticated: {user_response.user.email}")
        return user_response.user
    except Exception as e:
        logger.error(f"Auth error during verification: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []

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
def chat(request: ChatRequest, user=Depends(get_current_user)):
    """Chat endpoint for RAG-based Q&A (Protected)"""
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Using a more robust way to log message snippet
        msg_snippet = str(request.message)
        if len(msg_snippet) > 100:
            msg_snippet = msg_snippet[:100] + "..."
            
        logger.info(f"Authenticated user {user.email} (ID: {user.id}) queried: {msg_snippet}")
        
        # Convert history to dict format for the RAG service
        history_dicts = [msg.model_dump() for msg in request.history] if request.history else []
        
        answer = rag_service.get_answer(request.message, history=history_dicts)
        logger.info(f"Generated response for user {user.id}")
        
        return ChatResponse(response=answer)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred while processing your request: {str(e)}"
        )

async def stream_answer_generator(message: str, user, history=None):
    """Generator function for streaming responses"""
    try:
        msg_snippet = str(message)
        if len(msg_snippet) > 100:
            msg_snippet = msg_snippet[:100] + "..."
        logger.info(f"Streaming response for user {user.id} - query: {msg_snippet}")
        
        async for chunk in rag_service.get_answer_stream(message, history=history):
            yield f"data: {chunk}\n\n"
        
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"Error in streaming: {e}")
        yield f"data: ERROR: I encountered an error while processing your question. Please try again later.\n\n"

@app.get("/chat/stream")
async def chat_stream(message: str, history: str = "[]", user=Depends(get_current_user)):
    """Streaming chat endpoint using Server-Sent Events (SSE)"""
    try:
        if not message or not message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Parse history from JSON string
        import json
        try:
            history_list = json.loads(history) if history else []
        except json.JSONDecodeError:
            history_list = []
        
        return StreamingResponse(
            stream_answer_generator(message, user, history=history_list),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in streaming chat endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing your request: {str(e)}"
        )

class WebSearchRequest(BaseModel):
    query: str
    num_results: int = 5

class WebSearchResponse(BaseModel):
    results: List[dict]
    query: str

class UrlFetchRequest(BaseModel):
    url: str

class UrlFetchResponse(BaseModel):
    success: bool
    title: str
    url: str
    content: str
    error: Optional[str] = None

@app.post("/web/search", response_model=WebSearchResponse)
def web_search(request: WebSearchRequest, user=Depends(get_current_user)):
    """
    Search the web for information (Protected endpoint)
    Uses Tavily API if available, falls back to DuckDuckGo
    """
    try:
        logger.info(f"User {user.email} requested web search: {request.query}")
        
        results = web_search_service.search_web(request.query, num_results=request.num_results)
        
        return WebSearchResponse(results=results, query=request.query)
        
    except Exception as e:
        logger.error(f"Error in web search endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )

@app.post("/web/fetch", response_model=UrlFetchResponse)
def fetch_url(request: UrlFetchRequest, user=Depends(get_current_user)):
    """
    Fetch and parse content from a specific URL (Protected endpoint)
    """
    try:
        logger.info(f"User {user.email} requested URL fetch: {request.url}")
        
        result = web_search_service.fetch_url_content(request.url)
        
        if not result['success']:
            return UrlFetchResponse(
                success=False,
                title=result.get('title', ''),
                url=request.url,
                content='',
                error=result.get('error', 'Failed to fetch URL')
            )
        
        return UrlFetchResponse(
            success=True,
            title=result['title'],
            url=result['url'],
            content=result['content']
        )
        
    except Exception as e:
        logger.error(f"Error in URL fetch endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch URL: {str(e)}"
        )
