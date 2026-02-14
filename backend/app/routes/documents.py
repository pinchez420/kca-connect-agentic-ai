from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Header
from app.services.ingest_service import ingest_service
from supabase import create_client, Client
from app.core.config import settings
import logging

router = APIRouter(prefix="/documents", tags=["documents"])
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

async def get_current_user_id(authorization: str = Header(None)) -> str:
    """Dependency to verify Supabase JWT token and get user ID"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        # Expected format: "Bearer <token>"
        token = authorization.split(" ")[1] if " " in authorization else authorization
        
        # Verify with Supabase
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        return user_response.user.id
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@router.post("/extract")
async def extract_text(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """
    Extract text from a document for ephemeral use (e.g. attaching to chat).
    Does NOT ingest into vector DB.
    """
    try:
        # We need to ensure text extraction works
        text = await ingest_service.extract_text_from_file(file)
        return {"filename": file.filename, "content": text}
    except Exception as e:
        logger.error(f"Error extracting text: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    authorization: str = Header(None)
):
    """
    Upload a document (PDF, DOCX, TXT) for ingestion.
    1. Uploads to Supabase Storage (documents bucket).
    2. Ingests content into Qdrant.
    """
    try:
        logger.info(f"User {user_id} uploading file: {file.filename}")
        
        # 1. Upload to Supabase Storage
        # We need a service role client to bypass RLS if needed, or use the user's token
        # For simplicity in this agentic context, we might skip the actual Supabase Storage upload 
        # for now and just ingest, OR we try to upload if the bucket exists.
        
        # Let's try to upload to Supabase Storage "documents" bucket
        try:
            token = authorization.split(" ")[1] if " " in authorization else authorization
            user_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
            user_supabase.auth.set_session(token, user_id)
            
            file_content = await file.read()
            # Reset cursor for ingestion
            await file.seek(0)
            
            # Check if bucket exists/upload
            file_path = f"{user_id}/{file.filename}"
            user_supabase.storage.from_("documents").upload(
                file_path,
                file_content,
                {"content-type": file.content_type, "x-upsert": "true"}
            )
            logger.info(f"Uploaded {file.filename} to Supabase Storage")
            
        except Exception as e:
            logger.warning(f"Failed to upload to Supabase Storage (bucket might not exist): {e}")
            # Continue to ingestion anyway as that's the core requirement
            await file.seek(0)

        # 2. Ingest into Qdrant
        result = await ingest_service.process_file(file, user_id)
        
        return result
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/")
async def list_documents(user_id: str = Depends(get_current_user_id)):
    """
    List uploaded documents for the user.
    Uses Qdrant scroll to find documents with metadata.
    """
    try:
        # Search Qdrant for documents belonging to this user
        # We use scroll to get all points (limit to 100 for now)
        from qdrant_client.http import models
        
        # Filter by user_id
        filter_condition = models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.user_id",
                    match=models.MatchValue(value=user_id)
                )
            ]
        )
        
        # Scroll
        points, _ = ingest_service.client.scroll(
            collection_name=settings.COLLECTION_NAME,
            scroll_filter=filter_condition,
            limit=100,
            with_payload=True,
            with_vectors=False
        )
        
        # Aggregate unique files
        files = {}
        for point in points:
            payload = point.payload
            source = payload.get("metadata", {}).get("source")
            if source:
                if source not in files:
                    files[source] = {
                        "name": source,
                        "chunks": 0,
                        "type": payload.get("metadata", {}).get("type", "unknown")
                    }
                files[source]["chunks"] += 1
        
        return {"documents": list(files.values())}
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list documents")
