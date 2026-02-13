# Admin Analytics Dashboard - Implementation Plan

## Information Gathered

### Current Project State:
- **Backend**: FastAPI with Supabase (auth, database, storage)
- **Database**: `chats` table stores user chat history with messages JSONB
- **User Data**: Stored in Supabase Auth with `user_metadata` for profile info
- **Current Routes**: `/chat`, `/profile`, `/auth` for regular users
- **Analytics Available**: Chat history exists but no aggregated analytics

### Requirements:
1. **Admin Access**: Flag in user metadata (`_admin:is true`)
2. **Metrics to Track**:
   - Total users / Active users
   - Total chats / Messages per day
   - Most popular chat topics
   - User engagement metrics
   - System health
   - RAG knowledge base usage
3. **UI**: Dashboard layout with widgets and charts

---

## Plan

### Phase 1: Database & Backend (Admin System)

#### 1.1 Create Analytics Tracking Table
- New table: `analytics_events` - tracks user actions
- New table: `user_sessions` - tracks login/logout times

#### 1.2 Add Admin Flag Support
- Backend endpoint to check/set admin status
- Middleware to protect admin routes

#### 1.3 Create Analytics API Endpoints
- `GET /admin/analytics/overview` - Summary stats
- `GET /admin/analytics/users` - User statistics
- `GET /admin/analytics/chats` - Chat statistics
- `GET /admin/analytics/engagement` - Engagement metrics
- `GET /admin/analytics/system` - System health

---

### Phase 2: Frontend - Admin Dashboard

#### 2.1 New Admin Route
- Add `/admin` route (protected, admin-only)

#### 2.2 Admin Dashboard Components
- `AdminDashboard.jsx` - Main container
- `AnalyticsOverview.jsx` - Summary cards
- `UserAnalytics.jsx` - User statistics
- `ChatAnalytics.jsx` - Chat/message stats
- `SystemHealth.jsx` - System metrics
- `RAGAnalytics.jsx` - Knowledge base usage

#### 2.3 Sidebar Admin Link
- Add "Admin" menu item visible only to admin users

---

### Phase 3: Implementation Steps

#### Step 1: Database Migration
```sql
-- analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_at TIMESTAMP WITH TIME ZONE
);

-- Add is_admin to user metadata via config
-- (handled in Supabase dashboard or backend)
```

#### Step 2: Backend Endpoints
- `backend/app/routes/admin.py` - New admin routes module
- Analytics aggregation functions
- Admin middleware

#### Step 3: Frontend API
- Add admin API functions in `frontend/src/services/api.js`

#### Step 4: Admin Dashboard UI
- Create admin components with charts (recharts library)
- Widget-based layout

---

## Dependent Files to be Created/Modified

### New Files:
1. `backend/migrations/002_create_analytics_tables.sql`
2. `backend/app/routes/admin.py`
3. `frontend/src/components/AdminDashboard.jsx`
4. `frontend/src/components/admin/AnalyticsOverview.jsx`
5. `frontend/src/components/admin/UserAnalytics.jsx`
6. `frontend/src/components/admin/ChatAnalytics.jsx`
7. `frontend/src/components/admin/SystemHealth.jsx`
8. `frontend/src/components/admin/RAGAnalytics.jsx`

### Modified Files:
1. `backend/main.py` - Add admin routes
2. `frontend/src/App.jsx` - Add admin route
3. `frontend/src/services/api.js` - Add admin API calls
4. `frontend/src/components/Sidebar.jsx` - Add admin link

---

## Followup Steps

1. Install charting library: `npm install recharts` (or similar)
2. Run database migration in Supabase
3. Implement backend admin endpoints
4. Implement frontend admin dashboard
5. Test admin access control

