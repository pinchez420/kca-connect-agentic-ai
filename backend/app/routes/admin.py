import os
import httpx
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.core.config import settings
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def get_admin_user(authorization: str = Header(None)):
    """Dependency to verify admin user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        token = authorization.split(" ")[1] if " " in authorization else authorization
        
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user = user_response.user
        is_admin = user.user_metadata.get('_admin', False) if user.user_metadata else False
        
        if not is_admin:
            logger.warning(f"Non-admin user {user.email} attempted to access admin endpoints")
            raise HTTPException(status_code=403, detail="Admin access required")
        
        logger.info(f"Admin user {user.email} accessed admin dashboard")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error in admin: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


def get_service_client():
    """Get Supabase client with service role key for admin operations"""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


# ============ Analytics Response Models ============

class OverviewStats(BaseModel):
    total_users: int
    active_users_30d: int
    total_chats: int
    total_messages: int
    avg_session_duration: str

class DailyStat(BaseModel):
    date: str
    count: int

class TopicStat(BaseModel):
    title: str
    count: int

class UserStats(BaseModel):
    total: int
    active_30d: int
    new_users_last_7d: int

class ChatStats(BaseModel):
    total: int
    saved_chats: int
    avg_messages_per_chat: float

class EngagementStats(BaseModel):
    avg_session_duration: str
    avg_messages_per_user: float

class SystemHealth(BaseModel):
    status: str
    qdrant_collections: int
    rag_vectors: int


# ============ Admin Analytics Endpoints ============

@router.get("/analytics/overview", response_model=OverviewStats)
def get_analytics_overview(admin=Depends(get_admin_user)):
    """
    Get overview analytics - summary statistics
    """
    try:
        service = get_service_client()
        
        # Get total users
        try:
            users_response = service.auth.admin.list_users()
            total_users = len(users_response.users) if users_response.users else 0
        except:
            total_users = 0
        
        # Get active users (sessions in last 30 days)
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        try:
            sessions_response = service.table("user_sessions").select("user_id", count="exact").execute()
            active_users_30d = len(set([s['user_id'] for s in sessions_response.data if s.get('login_at', '') > thirty_days_ago])) if sessions_response.data else 0
        except:
            active_users_30d = 0
        
        # Get total chats
        try:
            chats_response = service.table("chats").select("id", count="exact").execute()
            total_chats = chats_response.count or 0
        except:
            total_chats = 0
        
        # Get total messages
        total_messages = 0
        try:
            if chats_response and chats_response.data:
                for chat in chats_response.data:
                    messages = chat.get('messages', [])
                    if isinstance(messages, list):
                        total_messages += len(messages)
        except:
            total_messages = 0
        
        # Get avg session duration
        avg_duration = "0h 0m"
        try:
            if sessions_response and sessions_response.data:
                sessions_with_logout = [s for s in sessions_response.data if s.get('logout_at')]
                if sessions_with_logout:
                    total_duration = sum(
                        (datetime.fromisoformat(s['logout_at'].replace('Z', '+00:00')) - 
                         datetime.fromisoformat(s['login_at'].replace('Z', '+00:00'))).total_seconds()
                        for s in sessions_with_logout
                    )
                    avg_seconds = total_duration / len(sessions_with_logout)
                    avg_duration = str(int(avg_seconds // 3600)) + "h " + str(int((avg_seconds % 3600) // 60)) + "m"
        except:
            avg_duration = "0h 0m"
        
        return {
            "total_users": total_users,
            "active_users_30d": active_users_30d,
            "total_chats": total_chats,
            "total_messages": total_messages,
            "avg_session_duration": avg_duration
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics overview: {e}")
        # Return default values instead of error
        return {
            "total_users": 0,
            "active_users_30d": 0,
            "total_chats": 0,
            "total_messages": 0,
            "avg_session_duration": "0h 0m"
        }


@router.get("/analytics/users", response_model=UserStats)
def get_user_analytics(admin=Depends(get_admin_user)):
    """
    Get user-specific analytics
    """
    try:
        service = get_service_client()
        
        # Get all users
        users_response = service.auth.admin.list_users()
        total_users = len(users_response.users) if users_response.users else 0
        
        # Get active users (last 30 days)
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        sessions_response = service.table("user_sessions").select("user_id").execute()
        active_users = len(set([s['user_id'] for s in sessions_response.data if s.get('login_at', '') > thirty_days_ago])) if sessions_response.data else 0
        
        # Get new users (last 7 days)
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        new_users = len([u for u in users_response.users if u.created_at and u.created_at > seven_days_ago]) if users_response.users else 0
        
        return {
            "total": total_users,
            "active_30d": active_users,
            "new_users_last_7d": new_users
        }
        
    except Exception as e:
        logger.error(f"Error getting user analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user analytics: {str(e)}")


@router.get("/analytics/chats", response_model=ChatStats)
def get_chat_analytics(admin=Depends(get_admin_user)):
    """
    Get chat-specific analytics
    """
    try:
        service = get_service_client()
        
        # Get all chats
        chats_response = service.table("chats").select("*").execute()
        chats = chats_response.data or []
        total_chats = len(chats)
        
        # Get saved chats
        saved_chats = len([c for c in chats if c.get('is_saved', False)])
        
        # Calculate avg messages per chat
        total_messages = sum(len(c.get('messages', [])) for c in chats)
        avg_messages = total_messages / total_chats if total_chats > 0 else 0
        
        return {
            "total": total_chats,
            "saved_chats": saved_chats,
            "avg_messages_per_chat": round(avg_messages, 1)
        }
        
    except Exception as e:
        logger.error(f"Error getting chat analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat analytics: {str(e)}")


@router.get("/analytics/chats/daily", response_model=List[DailyStat])
def get_chats_daily(admin=Depends(get_admin_user), days: int = 7):
    """
    Get number of chats created per day
    """
    try:
        service = get_service_client()
        
        # Calculate date range
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Get chats in date range
        response = service.table("chats").select("created_at").execute()
        chats = response.data or []
        
        # Group by date
        daily_counts = {}
        for chat in chats:
            created_at = chat.get('created_at', '')
            if created_at:
                date = created_at[:10]  # Get YYYY-MM-DD
                if date >= start_date[:10]:
                    daily_counts[date] = daily_counts.get(date, 0) + 1
        
        # Convert to list
        result = [{"date": date, "count": count} for date, count in sorted(daily_counts.items(), reverse=True)]
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting daily chats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get daily chat stats: {str(e)}")


@router.get("/analytics/messages/daily", response_model=List[DailyStat])
def get_messages_daily(admin=Depends(get_admin_user), days: int = 7):
    """
    Get number of messages per day
    """
    try:
        service = get_service_client()
        
        # Calculate date range
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Get all chats
        response = service.table("chats").select("created_at, messages").execute()
        chats = response.data or []
        
        # Group messages by date
        daily_counts = {}
        for chat in chats:
            created_at = chat.get('created_at', '')
            messages = chat.get('messages', [])
            
            if created_at and created_at[:10] >= start_date[:10]:
                date = created_at[:10]
                msg_count = len(messages) if isinstance(messages, list) else 0
                daily_counts[date] = daily_counts.get(date, 0) + msg_count
        
        # Convert to list
        result = [{"date": date, "count": count} for date, count in sorted(daily_counts.items(), reverse=True)]
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting daily messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get daily message stats: {str(e)}")


@router.get("/analytics/topics", response_model=List[TopicStat])
def get_top_topics(admin=Depends(get_admin_user), limit: int = 10):
    """
    Get most popular chat topics
    """
    try:
        service = get_service_client()
        
        # Get all chats with titles
        response = service.table("chats").select("title").execute()
        chats = response.data or []
        
        # Count titles (excluding "New Chat" and empty)
        title_counts = {}
        for chat in chats:
            title = chat.get('title', '')
            if title and title != 'New Chat' and len(title.strip()) > 0:
                title_counts[title] = title_counts.get(title, 0) + 1
        
        # Sort by count and get top N
        sorted_topics = sorted(title_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        return [{"title": title, "count": count} for title, count in sorted_topics]
        
    except Exception as e:
        logger.error(f"Error getting top topics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get top topics: {str(e)}")


@router.get("/analytics/engagement", response_model=EngagementStats)
def get_engagement_analytics(admin=Depends(get_admin_user)):
    """
    Get user engagement metrics
    """
    try:
        service = get_service_client()
        
        # Get all sessions
        sessions_response = service.table("user_sessions").select("*").execute()
        sessions = sessions_response.data or []
        
        # Calculate avg session duration
        sessions_with_logout = [s for s in sessions if s.get('logout_at')]
        if sessions_with_logout:
            total_duration = sum(
                (datetime.fromisoformat(s['logout_at'].replace('Z', '+00:00')) - 
                 datetime.fromisoformat(s['login_at'].replace('Z', '+00:00'))).total_seconds()
                for s in sessions_with_logout
            )
            avg_seconds = total_duration / len(sessions_with_logout)
            avg_duration = str(int(avg_seconds // 3600)) + "h " + str(int((avg_seconds % 3600) // 60)) + "m"
        else:
            avg_duration = "0h 0m"
        
        # Calculate avg messages per user
        chats_response = service.table("chats").select("user_id, messages").execute()
        chats = chats_response.data or []
        
        user_message_counts = {}
        for chat in chats:
            user_id = chat.get('user_id')
            messages = chat.get('messages', [])
            if user_id:
                msg_count = len(messages) if isinstance(messages, list) else 0
                user_message_counts[user_id] = user_message_counts.get(user_id, 0) + msg_count
        
        unique_users = len(user_message_counts)
        total_messages = sum(user_message_counts.values())
        avg_messages = total_messages / unique_users if unique_users > 0 else 0
        
        return {
            "avg_session_duration": avg_duration,
            "avg_messages_per_user": round(avg_messages, 1)
        }
        
    except Exception as e:
        logger.error(f"Error getting engagement analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get engagement analytics: {str(e)}")


@router.get("/analytics/system", response_model=SystemHealth)
def get_system_health(admin=Depends(get_admin_user)):
    """
    Get system health metrics
    """
    try:
        from app.services.rag_service import rag_service
        
        # Get Qdrant collections
        try:
            collections = rag_service.client.get_collections()
            qdrant_collections = len(collections.collections)
        except:
            qdrant_collections = 0
        
        # Get vector count from collection
        try:
            collection = rag_service.client.get_collection(settings.COLLECTION_NAME)
            vector_count = collection.vectors_count
        except:
            vector_count = 0
        
        return {
            "status": "healthy",
            "qdrant_collections": qdrant_collections,
            "rag_vectors": vector_count
        }
        
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        return {
            "status": "degraded",
            "qdrant_collections": 0,
            "rag_vectors": 0
        }


# ============ User Management Endpoints ============

@router.get("/users")
def get_all_users(admin=Depends(get_admin_user), limit: int = 50, offset: int = 0):
    """
    Get all users (admin only)
    """
    try:
        service = get_service_client()
        
        # Get users from auth
        response = service.auth.admin.list_users()
        users = response.users or []
        
        # Apply pagination
        paginated_users = users[offset:offset + limit]
        
        # Format user data
        result = []
        for user in paginated_users:
            # Get user's chat count
            chats_response = service.table("chats").select("id", count="exact").eq("user_id", user.id).execute()
            chat_count = chats_response.count or 0
            
            result.append({
                "id": user.id,
                "email": user.email,
                "created_at": user.created_at,
                "last_sign_in": user.last_sign_in_at,
                "chat_count": chat_count,
                "is_admin": user.user_metadata.get('_admin', False) if user.user_metadata else False,
                "full_name": user.user_metadata.get('full_name', '') if user.user_metadata else '',
                "campus_branch": user.user_metadata.get('campus_branch', '') if user.user_metadata else ''
            })
        
        return {
            "users": result,
            "total": len(users)
        }
        
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")


@router.post("/users/{user_id}/make-admin")
def make_user_admin(user_id: str, admin=Depends(get_admin_user)):
    """
    Grant admin privileges to a user
    """
    try:
        service = get_service_client()
        
        # Get current user metadata
        user_response = service.auth.admin.get_user_by_id(user_id)
        current_metadata = user_response.user.user_metadata or {}
        
        # Add admin flag
        current_metadata['_admin'] = True
        
        # Update user
        service.auth.admin.update_user_by_id(
            user_id,
            {"data": current_metadata}
        )
        
        return {"success": True, "message": f"User {user_id} is now an admin"}
        
    except Exception as e:
        logger.error(f"Error making user admin: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to make user admin: {str(e)}")


@router.post("/users/{user_id}/remove-admin")
def remove_user_admin(user_id: str, admin=Depends(get_admin_user)):
    """
    Remove admin privileges from a user
    """
    try:
        service = get_service_client()
        
        # Get current user metadata
        user_response = service.auth.admin.get_user_by_id(user_id)
        current_metadata = user_response.user.user_metadata or {}
        
        # Remove admin flag
        current_metadata['_admin'] = False
        
        # Update user
        service.auth.admin.update_user_by_id(
            user_id,
            {"data": current_metadata}
        )
        
        return {"success": True, "message": f"Admin privileges removed from user {user_id}"}
        
    except Exception as e:
        logger.error(f"Error removing admin: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove admin: {str(e)}")

