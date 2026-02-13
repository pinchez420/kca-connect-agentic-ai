import os
import json
from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.services.rag_service import rag_service
from app.services.web_search_service import web_search_service
from app.core.config import settings
from app.routes import admin
from supabase import create_client, Client
from uuid import UUID
import logging
import asyncio
from datetime import datetime

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

# Include admin routes
app.include_router(admin.router)

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

# Chat History Models
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: str

class CreateChatRequest(BaseModel):
    title: Optional[str] = None
    messages: List[ChatMessage]

class UpdateChatRequest(BaseModel):
    title: Optional[str] = None
    messages: Optional[List[ChatMessage]] = None
    is_saved: Optional[bool] = None

class ChatResponse(BaseModel):
    id: str
    user_id: str
    title: str
    messages: List[ChatMessage]
    is_saved: bool
    created_at: str
    updated_at: str

class ChatListResponse(BaseModel):
    chats: List[dict]
    total: int

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

# ============ Chat History Endpoints ============

@app.get("/chats", response_model=ChatListResponse)
def get_chats(
    limit: int = 50, 
    offset: int = 0, 
    saved_only: bool = False,
    user=Depends(get_current_user)
):
    """
    Get all chats for the authenticated user (with pagination)
    """
    try:
        logger.info(f"Fetching chats for user {user.id}, saved_only={saved_only}")
        
        # Use httpx directly to bypass any Supabase client issues
        import httpx
        
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json"
        }
        
        # Build query URL
        params = {
            "select": "*",
            "user_id": f"eq.{user.id}",
            "order": "updated_at.desc",
            "offset": offset,
            "limit": limit
        }
        
        if saved_only:
            params["is_saved"] = "eq.true"
        
        with httpx.Client() as client:
            url = f"{settings.SUPABASE_URL}/rest/v1/chats"
            response = client.get(url, headers=headers, params=params)
            
            logger.info(f"Direct REST API response status: {response.status_code}")
            logger.info(f"Direct REST API response: {response.text}")
            
            if response.status_code == 200:
                chats = response.json()
                return {
                    "chats": chats,
                    "total": len(chats)
                }
            else:
                logger.error(f"Failed to fetch chats: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Failed to fetch chats")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chats")

@app.get("/chats/{chat_id}", response_model=ChatResponse)
def get_chat(chat_id: str, user=Depends(get_current_user)):
    """
    Get a specific chat by ID
    """
    try:
        result = supabase.table("chats").select("*").eq("id", chat_id).eq("user_id", user.id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        chat = result.data[0]
        return {
            "id": chat["id"],
            "user_id": chat["user_id"],
            "title": chat["title"],
            "messages": chat["messages"],
            "is_saved": chat["is_saved"],
            "created_at": chat["created_at"],
            "updated_at": chat["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat")

@app.post("/chats", response_model=ChatResponse)
def create_chat(request: CreateChatRequest, user=Depends(get_current_user), authorization: str = Header(None)):
    """
    Create a new chat
    """
    try:
        # Extract the user's JWT token
        token = authorization.split(" ")[1] if " " in authorization else authorization
        
        # Create a new Supabase client with the user's token for authenticated operations
        user_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        user_supabase.auth.set_session(token, user.id)
        
        # Generate title from first message if not provided
        title = request.title
        if not title and request.messages:
            first_msg = request.messages[0].content if hasattr(request.messages[0], 'content') else request.messages[0]['content']
            title = first_msg[:50] + "..." if len(first_msg) > 50 else first_msg
        
        chat_data = {
            "user_id": user.id,
            "title": title or "New Chat",
            "messages": [m.model_dump() if hasattr(m, 'model_dump') else m for m in request.messages],
            "is_saved": False
        }
        
        result = user_supabase.table("chats").insert(chat_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create chat")
        
        chat = result.data[0]
        return {
            "id": chat["id"],
            "user_id": chat["user_id"],
            "title": chat["title"],
            "messages": chat["messages"],
            "is_saved": chat["is_saved"],
            "created_at": chat["created_at"],
            "updated_at": chat["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to create chat")

@app.put("/chats/{chat_id}", response_model=ChatResponse)
def update_chat(chat_id: str, request: UpdateChatRequest, user=Depends(get_current_user), authorization: str = Header(None)):
    """
    Update an existing chat (messages, title, or saved status)
    """
    try:
        # Extract the user's JWT token
        token = authorization.split(" ")[1] if " " in authorization else authorization
        
        # Create a new Supabase client with the user's token for authenticated operations
        user_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        user_supabase.auth.set_session(token, user.id)
        
        # First verify the chat belongs to the user
        check = user_supabase.table("chats").select("id").eq("id", chat_id).eq("user_id", user.id).execute()
        if not check.data or len(check.data) == 0:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Build update data
        update_data = {}
        if request.title is not None:
            update_data["title"] = request.title
        if request.messages is not None:
            update_data["messages"] = [m.model_dump() if hasattr(m, 'model_dump') else m for m in request.messages]
        if request.is_saved is not None:
            update_data["is_saved"] = request.is_saved
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        result = user_supabase.table("chats").update(update_data).eq("id", chat_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update chat")
        
        chat = result.data[0]
        return {
            "id": chat["id"],
            "user_id": chat["user_id"],
            "title": chat["title"],
            "messages": chat["messages"],
            "is_saved": chat["is_saved"],
            "created_at": chat["created_at"],
            "updated_at": chat["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to update chat")

@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: str, user=Depends(get_current_user), authorization: str = Header(None)):
    """
    Delete a chat
    """
    try:
        # Extract the user's JWT token
        token = authorization.split(" ")[1] if " " in authorization else authorization
        
        # Create a new Supabase client with the user's token for authenticated operations
        user_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        user_supabase.auth.set_session(token, user.id)
        
        # First verify the chat belongs to the user
        check = user_supabase.table("chats").select("id").eq("id", chat_id).eq("user_id", user.id).execute()
        if not check.data or len(check.data) == 0:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        user_supabase.table("chats").delete().eq("id", chat_id).execute()
        
        return {"message": "Chat deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete chat")

@app.post("/chats/{chat_id}/save")
def toggle_save_chat(chat_id: str, user=Depends(get_current_user), authorization: str = Header(None)):
    """
    Toggle the saved status of a chat
    """
    try:
        # Extract the user's JWT token
        token = authorization.split(" ")[1] if " " in authorization else authorization
        
        # Create a new Supabase client with the user's token for authenticated operations
        user_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        user_supabase.auth.set_session(token, user.id)
        
        # First get current status
        result = user_supabase.table("chats").select("id, is_saved").eq("id", chat_id).eq("user_id", user.id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        current_status = result.data[0]["is_saved"]
        new_status = not current_status
        
        update_result = user_supabase.table("chats").update({
            "is_saved": new_status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", chat_id).execute()
        
        return {
            "message": f"Chat {'saved' if new_status else 'unsaved'} successfully",
            "is_saved": new_status
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling save status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update save status")

@app.post("/chats/saved", response_model=ChatListResponse)
def get_saved_chats(limit: int = 50, offset: int = 0, user=Depends(get_current_user)):
    """
    Get all saved chats for the authenticated user
    """
    return get_chats(limit=limit, offset=offset, saved_only=True, user=user)

class AutoSaveRequest(BaseModel):
    title: Optional[str] = None
    messages: List[ChatMessage]
    chat_id: Optional[str] = None

@app.post("/auto-save")
def auto_save_chat(request: AutoSaveRequest, user=Depends(get_current_user)):
    """
    Auto-save chat: Creates a new chat or updates existing one
    If chat_id is provided, updates that chat. Otherwise creates new.
    """
    try:
        import httpx
        
        # Generate title from first message if not provided
        title = request.title
        if not title and request.messages:
            first_msg = request.messages[0].content if hasattr(request.messages[0], 'content') else request.messages[0]['content']
            title = first_msg[:50] + "..." if len(first_msg) > 50 else first_msg
        
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        with httpx.Client() as client:
            # If chat_id provided, try to update existing chat
            if request.chat_id:
                # First verify the chat belongs to the user
                check_url = f"{settings.SUPABASE_URL}/rest/v1/chats?id=eq.{request.chat_id}&user_id=eq.{user.id}"
                check_response = client.get(check_url, headers=headers)
                
                if check_response.status_code == 200 and check_response.json():
                    # Chat exists and belongs to user - UPDATE it
                    update_data = {
                        "title": title or "New Chat",
                        "messages": [m.model_dump() if hasattr(m, 'model_dump') else m for m in request.messages],
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    update_url = f"{settings.SUPABASE_URL}/rest/v1/chats?id=eq.{request.chat_id}"
                    update_response = client.patch(update_url, headers=headers, json=update_data)
                    
                    logger.info(f"Auto-save update response status: {update_response.status_code}")
                    
                    if update_response.status_code in [200, 201]:
                        result = update_response.json()
                        logger.info(f"Chat auto-saved (updated) successfully: {request.chat_id}")
                        return {
                            "success": True,
                            "chat_id": request.chat_id,
                            "message": "Chat updated successfully"
                        }
            
            # Either no chat_id provided, or update failed - CREATE new chat
            chat_data = {
                "user_id": user.id,
                "title": title or "New Chat",
                "messages": [m.model_dump() if hasattr(m, 'model_dump') else m for m in request.messages],
                "is_saved": False
            }
            
            url = f"{settings.SUPABASE_URL}/rest/v1/chats"
            response = client.post(url, headers=headers, json=chat_data)
            
            logger.info(f"Auto-save create response status: {response.status_code}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                chat_id = result[0]['id'] if result else None
                logger.info(f"Chat auto-saved (created) successfully: {chat_id}")
                return {
                    "success": True,
                    "chat_id": chat_id,
                    "message": "Chat created successfully"
                }
            else:
                logger.error(f"Auto-save failed: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Failed to auto-save chat")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in auto-save: {e}")
        raise HTTPException(status_code=500, detail="Failed to auto-save chat")

# ============ User Profile Endpoints ============

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    course_name: Optional[str] = None
    campus_branch: Optional[str] = None
    contact_number: Optional[str] = None

@app.put("/user/profile")
def update_user_profile(request: UpdateProfileRequest, user=Depends(get_current_user), authorization: str = Header(None)):
    """
    Update user profile metadata (course, campus, contact number, etc.)
    """
    try:
        logger.info(f"Updating profile for user {user.id}")
        
        # Extract the user's JWT token
        token = authorization.split(" ")[1] if " " in authorization else authorization
        
        # Create a new Supabase client with the user's token for authenticated operations
        user_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        user_supabase.auth.set_session(token, user.id)
        
        # Build update data for user_metadata
        update_data = {}
        
        if request.full_name is not None:
            update_data["full_name"] = request.full_name
        
        # These will be stored in user_metadata as custom fields
        if request.course_name is not None:
            update_data["course_name"] = request.course_name
        
        if request.campus_branch is not None:
            update_data["campus_branch"] = request.campus_branch
        
        if request.contact_number is not None:
            update_data["contact_number"] = request.contact_number
        
        # Update user metadata in Supabase using user-specific client
        result = user_supabase.auth.update_user({
            "data": update_data
        })
        
        if result.user:
            logger.info(f"Profile updated successfully for user {user.id}")
            return {
                "success": True,
                "message": "Profile updated successfully",
                "user": {
                    "id": result.user.id,
                    "email": result.user.email,
                    "user_metadata": result.user.user_metadata
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update profile")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@app.post("/user/avatar")
async def upload_avatar(
    user=Depends(get_current_user),
    authorization: str = Header(None),
    avatar: UploadFile = File(...)
):
    """
    Upload user avatar to Supabase Storage
    """
    try:
        logger.info(f"Uploading avatar for user {user.id}")
        
        if not avatar or not avatar.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if avatar.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
            )
        
        # Read file content
        file_content = await avatar.read()
        file_size = len(file_content)
        max_size = 5 * 1024 * 1024  # 5MB
        
        if file_size > max_size:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
        
        # Generate unique filename
        import uuid
        file_ext = avatar.filename.split(".")[-1] if "." in avatar.filename else "jpg"
        file_name = f"{user.id}/{uuid.uuid4()}.{file_ext}"
        
        # Use service role client for storage operations (bypasses RLS)
        try:
            service_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            
            upload_result = service_supabase.storage.from_("avatars").upload(
                file_name, 
                file_content, 
                {"content-type": avatar.content_type}
            )
            
            if upload_result.path:
                # Get public URL
                public_url = service_supabase.storage.from_("avatars").get_public_url(file_name)
                
                # Create a user-specific client to update user metadata
                token = authorization.split(" ")[1] if " " in authorization else authorization
                user_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
                user_supabase.auth.set_session(token, user.id)
                
                # Update user metadata with avatar URL
                update_result = user_supabase.auth.update_user({
                    "data": {"avatar_url": public_url}
                })
                
                logger.info(f"Avatar uploaded successfully for user {user.id}: {public_url}")
                
                return {
                    "success": True,
                    "message": "Avatar uploaded successfully",
                    "avatar_url": public_url
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to upload avatar to storage")
                
        except Exception as storage_error:
            logger.error(f"Storage error: {storage_error}")
            
            # Return helpful error message
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to upload avatar: {str(storage_error)}. Please check Supabase Storage bucket configuration."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading avatar: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {str(e)}")
