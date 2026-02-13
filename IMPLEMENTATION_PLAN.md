# Implementation Plan

## KCA Connect Agentic AI - Project Implementation Plan

**Document Version:** 1.0  
**Date:** 2025  
**Project:** KCA University AI Chat Assistant  
**Project Manager:** Development Team  

---

## 1. Executive Summary

This document outlines the comprehensive implementation plan for the KCA Connect Agentic AI project. The project is a web-based AI-powered chat interface that allows KCA University students and staff to access information about timetables, fees, exams, and more through natural language conversations.

### 1.1 Project Objectives
- Provide an intelligent AI assistant for KCA University students and staff
- Enable natural language queries about university information
- Leverage RAG (Retrieval-Augmented Generation) for accurate responses
- Support multiple LLM providers (Google Gemini, Groq, Cerebras)
- Implement chat history and user profile management

### 1.2 Project Timeline
| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Setup & Foundation | 2 weeks | Week 1 | Week 2 |
| Phase 2: Backend Development | 4 weeks | Week 3 | Week 6 |
| Phase 3: Frontend Development | 4 weeks | Week 5 | Week 8 |
| Phase 4: Integration & Testing | 3 weeks | Week 9 | Week 11 |
| Phase 5: Deployment & Launch | 2 weeks | Week 12 | Week 13 |
| **Total** | **15 weeks** | | |

---

## 2. Architecture Overview

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Landing  │  │ Auth     │  │ Chat     │  │ User Profile     │ │
│  │ Page     │  │ Portal   │  │ Interface│  │ & Settings       │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│         │           │            │                │            │
│         └───────────┼────────────┼────────────────┼────────────┘
│                     │            │                │
│              ┌──────▼─────┐   ┌──▼──────────────▼──┐
│              │  Context   │   │     API Service     │
│              │  (Auth/    │   │  (axios/fetch)      │
│              │   Theme)   │   └─────────────────────┘
│              └────────────┘           │
└───────────────────────────────────────┼───────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐   │
│  │ Auth     │  │ Chat     │  │ RAG Pipeline                │   │
│  │ Endpoints│  │ API      │  │  ┌─────────┐  ┌─────────┐ │   │
│  └──────────┘  └──────────┘  │  │ Vector  │  │ LLM     │ │   │
│                              │  │ Search  │  │ (Gemini/│ │   │
│  ┌──────────┐  ┌──────────┐  │  │ (Qdrant)│  │ Groq)   │ │   │
│  │ Profile  │  │ Web      │  │  └─────────┘  └─────────┘ │   │
│  │ API      │  │ Search   │  └──────────────────────────┘   │
│  └──────────┘  └──────────┘                                 │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│  Qdrant Vector DB │  │   Supabase        │  │   External APIs    │
│  (Document Store) │  │   (Auth + Chat)  │  │   (Google, Groq)  │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

### 2.2 Technology Stack

#### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| Vite | 7.x | Build Tool |
| Tailwind CSS | 4.x | Styling |
| React Router | 7.x | Routing |
| Supabase Client | 2.x | Auth & Database |
| Axios | 1.x | HTTP Client |

#### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.109+ | Web Framework |
| Python | 3.11+ | Runtime |
| LangChain | 0.2+ | AI Orchestration |
| Qdrant | Latest | Vector Database |
| Supabase | Python | Auth Client |
| Pydantic | 2.x | Validation |

#### AI & ML
| Technology | Purpose |
|------------|---------|
| Google Gemini 1.5 Flash | Primary LLM |
| Groq (Llama 3.3 70B) | Fast LLM |
| Cerebras (Llama 3.3 70B) | Alternative LLM |
| HuggingFace Embeddings | Text Embeddings |
| Tavily/DuckDuckGo | Web Search |

---

## 3. Implementation Phases

### Phase 1: Setup & Foundation (Weeks 1-2)

#### Week 1: Environment Setup

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 1.1.1 | Initialize project repository | Dev Team | 1 day | None |
| 1.1.2 | Configure Git workflow & branches | Dev Team | 1 day | 1.1.1 |
| 1.1.3 | Set up Docker environment | Dev Team | 1 day | None |
| 1.1.4 | Create frontend scaffold (Vite + React) | Dev Team | 1 day | 1.1.1 |
| 1.1.5 | Create backend scaffold (FastAPI) | Dev Team | 1 day | 1.1.1 |
| 1.1.6 | Configure Tailwind CSS | Dev Team | 0.5 day | 1.1.4 |
| 1.1.7 | Set up Supabase project | Dev Team | 0.5 day | None |

**Deliverables:**
- [ ] Git repository with proper structure
- [ ] Docker Compose configuration
- [ ] Frontend project with routing
- [ ] Backend project with FastAPI
- [ ] Tailwind CSS configured

#### Week 2: Infrastructure & Dependencies

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 1.2.1 | Install backend dependencies | Dev Team | 0.5 day | 1.1.5 |
| 1.2.2 | Install frontend dependencies | Dev Team | 0.5 day | 1.1.4 |
| 1.2.3 | Configure Qdrant vector database | Dev Team | 1 day | Docker |
| 1.2.4 | Set up Supabase auth tables | Dev Team | 0.5 day | Supabase |
| 1.2.5 | Create migrations for chat history | Dev Team | 1 day | 1.2.4 |
| 1.2.6 | Configure environment variables | Dev Team | 0.5 day | None |
| 1.2.7 | Set up API documentation (Swagger) | Dev Team | 0.5 day | 1.1.5 |

**Deliverables:**
- [ ] All dependencies installed
- [ ] Qdrant running locally
- [ ] Supabase tables created
- [ ] Environment configuration complete
- [ ] API docs accessible at /docs

**Milestone 1: Foundation Complete**
- [ ] All services running locally
- [ ] Frontend accessible at localhost:5173
- [ ] Backend accessible at localhost:8000
- [ ] API documentation available

---

### Phase 2: Backend Development (Weeks 3-6)

#### Week 3: Core Backend & Auth

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 2.3.1 | Implement config loader | Backend Dev | 1 day | Phase 1 Complete |
| 2.3.2 | Create Supabase auth service | Backend Dev | 2 days | Config |
| 2.3.3 | Implement JWT token validation | Backend Dev | 1 day | 2.3.2 |
| 2.3.4 | Create health check endpoints | Backend Dev | 0.5 day | None |
| 2.3.5 | Configure CORS middleware | Backend Dev | 0.5 day | None |
| 2.3.6 | Write unit tests for auth | Backend Dev | 2 days | 2.3.3 |

**APIs Implemented:**
```
GET  /              - Service status
GET  /health        - Detailed health check
POST /auth/register - User registration
POST /auth/login    - User login
GET  /auth/me       - Get current user
POST /auth/logout   - User logout
```

#### Week 4: RAG Service & Document Processing

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 2.4.1 | Implement embedding service | Backend Dev | 2 days | Config |
| 2.4.2 | Create Qdrant vector store service | Backend Dev | 2 days | 2.4.1 |
| 2.4.3 | Implement document ingestion script | Backend Dev | 2 days | 2.4.2 |
| 2.4.4 | Create PDF text extractor | Backend Dev | 1 day | None |
| 2.4.5 | Write tests for RAG service | Backend Dev | 1 day | 2.4.3 |

**Services Implemented:**
- `RagService` - Core RAG pipeline
- `QdrantService` - Vector database operations
- `EmbeddingService` - Text embeddings generation
- `DocumentProcessor` - PDF parsing and chunking

#### Week 5: Chat API & LLM Integration

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 2.5.1 | Implement LLM factory (Gemini/Groq/Cerebras) | Backend Dev | 2 days | Config |
| 2.5.2 | Create chat endpoint (non-streaming) | Backend Dev | 2 days | 2.4.1 |
| 2.5.3 | Implement streaming chat endpoint (SSE) | Backend Dev | 2 days | 2.5.2 |
| 2.5.4 | Add conversation context handling | Backend Dev | 1 day | 2.5.2 |
| 2.5.5 | Write tests for chat endpoints | Backend Dev | 1 day | 2.5.3 |

**APIs Implemented:**
```
POST /chat           - Non-streaming chat
GET  /chat/stream    - Streaming chat (SSE)
```

#### Week 6: Chat History & User Profile APIs

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 2.6.1 | Create chat CRUD endpoints | Backend Dev | 2 days | Auth |
| 2.6.2 | Implement auto-save functionality | Backend Dev | 1 day | 2.6.1 |
| 2.6.3 | Create user profile endpoints | Backend Dev | 2 days | Auth |
| 2.6.4 | Implement avatar upload | Backend Dev | 1 day | 2.6.3 |
| 2.6.5 | Write tests for history/profile | Backend Dev | 2 days | 2.6.4 |

**APIs Implemented:**
```
GET    /chats                    - List chats (paginated)
POST   /chats                    - Create chat
GET    /chats/{id}               - Get specific chat
PUT    /chats/{id}               - Update chat
DELETE /chats/{id}               - Delete chat
POST   /chats/{id}/save          - Toggle save status
GET    /chats/saved              - Get saved chats
POST   /auto-save                - Auto-save chat
PUT    /user/profile             - Update profile
POST   /user/avatar              - Upload avatar
```

**Milestone 2: Backend Complete**
- [ ] All API endpoints implemented
- [ ] RAG pipeline functional
- [ ] LLM integration working
- [ ] Chat history saved to Supabase
- [ ] User profiles managed
- [ ] All backend tests passing

---

### Phase 3: Frontend Development (Weeks 5-8)

#### Week 5: Foundation & Landing Page

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 3.5.1 | Set up React Router | Frontend Dev | 0.5 day | Phase 1 |
| 3.5.2 | Create AuthContext | Frontend Dev | 1 day | None |
| 3.5.3 | Create ThemeContext | Frontend Dev | 0.5 day | None |
| 3.5.4 | Implement Supabase client | Frontend Dev | 0.5 day | Config |
| 3.5.5 | Build Landing Page | Frontend Dev | 2 days | Tailwind |
| 3.5.6 | Add responsive design | Frontend Dev | 1 day | 3.5.5 |
| 3.5.7 | Create reusable components | Frontend Dev | 1 day | None |

**Components Created:**
- `Button`, `Input`, `Modal`, `Card` (UI Library)
- `LandingPage` - Marketing page
- `AuthContext` - Authentication state
- `ThemeContext` - Theme management

#### Week 6: Authentication Flow

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 3.6.1 | Build Auth Page | Frontend Dev | 2 days | AuthContext |
| 3.6.2 | Implement login form | Frontend Dev | 1 day | 3.6.1 |
| 3.6.3 | Implement registration form | Frontend Dev | 1 day | 3.6.1 |
| 3.6.4 | Add password visibility toggle | Frontend Dev | 0.5 day | 3.6.2 |
| 3.6.5 | Implement session persistence | Frontend Dev | 0.5 day | 3.6.1 |
| 3.6.6 | Create protected routes | Frontend Dev | 0.5 day | Router |
| 3.6.7 | Write auth component tests | Frontend Dev | 1 day | 3.6.6 |

**Pages/Components:**
- `/auth` - Login/Register page
- Route protection for `/chat`, `/profile`

#### Week 7: Chat Interface

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 3.7.1 | Build Chat Interface layout | Frontend Dev | 1 day | None |
| 3.7.2 | Implement message display | Frontend Dev | 2 days | Layout |
| 3.7.3 | Create message input | Frontend Dev | 1 day | None |
| 3.7.4 | Implement non-streaming chat | Frontend Dev | 1 day | API service |
| 3.7.5 | Implement streaming chat (SSE) | Frontend Dev | 2 days | 3.7.4 |
| 3.7.6 | Add stop generation feature | Frontend Dev | 0.5 day | 3.7.5 |
| 3.7.7 | Add copy to clipboard | Frontend Dev | 0.5 day | Messages |
| 3.7.8 | Write chat component tests | Frontend Dev | 1 day | 3.7.6 |

**Components:**
- `ChatInterface` - Main chat page
- `MessageBubble` - Individual message
- `MessageInput` - User input field
- `StreamingIndicator` - Loading state

#### Week 8: Sidebar, History & Profile

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 3.8.1 | Build Sidebar component | Frontend Dev | 1.5 days | None |
| 3.8.2 | Implement theme switcher | Frontend Dev | 0.5 day | ThemeContext |
| 3.8.3 | Build ChatHistoryModal | Frontend Dev | 1.5 days | API service |
| 3.8.4 | Implement saved chats view | Frontend Dev | 1 day | 3.8.3 |
| 3.8.5 | Add chat load functionality | Frontend Dev | 1 day | 3.8.3 |
| 3.8.6 | Build UserProfile page | Frontend Dev | 1 day | None |
| 3.8.7 | Implement profile editing | Frontend Dev | 1 day | 3.8.6 |
| 3.8.8 | Add avatar upload | Frontend Dev | 0.5 day | 3.8.6 |
| 3.8.9 | Write frontend integration tests | Frontend Dev | 1 day | All above |

**Components:**
- `Sidebar` - Navigation and actions
- `ChatHistoryModal` - Chat history browser
- `SavedChatsModal` - Filtered saved chats
- `UserProfile` - Profile management
- `ProfileModal` - Quick profile edit
- `Settings` - Theme and preferences

**Milestone 3: Frontend Complete**
- [ ] All pages implemented
- [ ] All components working
- [ ] Chat interface fully functional
- [ ] Chat history managed
- [ ] User profiles updated
- [ ] All frontend tests passing

---

### Phase 4: Integration & Testing (Weeks 9-11)

#### Week 9: Integration

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 4.9.1 | Frontend-Backend integration | Dev Team | 2 days | Phase 2-3 Complete |
| 4.9.2 | Authentication flow integration | Dev Team | 1 day | 4.9.1 |
| 4.9.3 | Chat flow integration | Dev Team | 2 days | 4.9.1 |
| 4.9.4 | Profile sync integration | Dev Team | 1 day | 4.9.1 |
| 4.9.5 | Fix integration bugs | Dev Team | 2 days | All above |

#### Week 10: Testing

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 4.10.1 | Execute test plan | QA Team | 3 days | Integration |
| 4.10.2 | Fix critical bugs | Dev Team | 2 days | 4.10.1 |
| 4.10.3 | Fix high priority bugs | Dev Team | 1 day | 4.10.2 |
| 4.10.4 | Performance testing | QA Team | 1 day | Integration |
| 4.10.5 | Cross-browser testing | QA Team | 1 day | Integration |

#### Week 11: Bug Fixing & Refinement

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 4.11.1 | Fix remaining bugs | Dev Team | 3 days | Week 10 |
| 4.11.2 | UI/UX polish | Frontend Dev | 2 days | Bug fixes |
| 4.11.3 | Performance optimization | Dev Team | 1 day | Testing |
| 4.11.4 | Security review | Dev Team | 1 day | All |
| 4.11.5 | Final test cycle | QA Team | 2 days | All above |

**Milestone 4: Testing Complete**
- [ ] All critical bugs fixed
- [ ] Performance targets met
- [ ] Security scan passed
- [ ] Cross-browser compatibility verified

---

### Phase 5: Deployment & Launch (Weeks 12-13)

#### Week 12: Deployment Preparation

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 5.12.1 | Prepare production environment | DevOps | 1 day | Phase 4 Complete |
| 5.12.2 | Configure production settings | DevOps | 1 day | 5.12.1 |
| 5.12.3 | Set up CI/CD pipeline | DevOps | 2 days | 5.12.1 |
| 5.12.4 | Deploy to staging | DevOps | 1 day | 5.12.3 |
| 5.12.5 | Staging verification | QA Team | 1 day | 5.12.4 |

#### Week 13: Production Launch

| Task | Description | Owner | Duration | Dependencies |
|------|-------------|-------|----------|--------------|
| 5.13.1 | Final production deployment | DevOps | 1 day | Week 12 Complete |
| 5.13.2 | Production smoke tests | QA Team | 0.5 day | 5.13.1 |
| 5.13.3 | Monitor system health | DevOps | 2 days | 5.13.1 |
| 5.13.4 | User acceptance testing | Stakeholders | 2 days | 5.13.2 |
| 5.13.5 | Address launch issues | Dev Team | 1.5 days | All |
| 5.13.6 | Project documentation | Dev Team | 1 day | All |

**Milestone 5: Production Launch**
- [ ] Application live at production URL
- [ ] All smoke tests passed
- [ ] User acceptance completed
- [ ] Documentation finalized

---

## 4. Detailed Task Breakdown

### 4.1 Frontend Component Hierarchy

```
App.jsx
├── Router
│   ├── LandingPage (/)
│   ├── Auth (/auth)
│   ├── ChatInterface (/chat)
│   └── UserProfile (/profile)
│
├── Context Providers
│   ├── AuthProvider
│   └── ThemeProvider
│
└── Shared Components
    ├── Sidebar
    ├── Settings
    ├── ChatHistoryModal
    ├── SavedChatsModal
    ├── ProfileModal
    └── kca-logo.png
```

### 4.2 Backend API Structure

```
main.py
├── / (GET) - Service status
├── /health (GET) - Health check
├── /docs (GET) - Swagger UI
│
├── /chat (POST) - Non-streaming chat
├── /chat/stream (GET) - Streaming chat
│
├── /chats (GET, POST) - List/Create chats
├── /chats/{id} (GET, PUT, DELETE) - CRUD
├── /chats/{id}/save (POST) - Toggle save
├── /chats/saved (GET) - Get saved chats
├── /auto-save (POST) - Auto-save
│
├── /web/search (POST) - Web search
├── /web/fetch (POST) - Fetch URL
│
└── /user
    ├── /profile (PUT) - Update profile
    └── /avatar (POST) - Upload avatar
```

### 4.3 RAG Pipeline Architecture

```
User Query
    │
    ▼
┌─────────────────┐
│ Query理解       │  ← Contextualize with history
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Relevance Check │  ← Vector search similarity
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  RAG      Web Search
    │         │
    ▼         ▼
┌─────────────────┐
│ Context融合     │  ← Combine docs + web results
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM Generation  │  ← Gemini/Groq/Cerebras
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Response输出    │  ← Stream to user
└─────────────────┘
```

---

## 5. Resource Requirements

### 5.1 Human Resources

| Role | Number | Responsibilities |
|------|--------|------------------|
| Project Manager | 1 | Overall coordination |
| Backend Developer | 2 | API, RAG, database |
| Frontend Developer | 2 | UI, components, UX |
| QA Engineer | 1 | Testing, bug tracking |
| DevOps Engineer | 1 | Deployment, CI/CD |

### 5.2 Infrastructure Requirements

| Resource | Specification | Purpose |
|----------|---------------|---------|
| Development Server | Local machines | Development |
| Staging Server | 2 vCPU, 4GB RAM | Testing |
| Production Server | 4 vCPU, 8GB RAM | Live application |
| Qdrant Cloud | Free tier | Vector database |
| Supabase | Free tier | Auth, chat storage |

### 5.3 External Services

| Service | Purpose | Cost |
|---------|---------|------|
| Google AI Studio | Gemini API | Pay-per-use |
| Groq | LLM Inference | Free tier available |
| Cerebras | LLM Inference | API key required |
| Tavily | Web Search | Free tier available |
| Supabase | Auth & Database | Free tier |

---

## 6. Risk Management

### 6.1 Risk Assessment Matrix

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API key exposure | Critical | Low | Environment variables, rotation |
| Third-party API downtime | High | Medium | Fallback providers, caching |
| Qdrant data loss | High | Low | Regular backups |
| Supabase rate limits | Medium | Medium | Request optimization |
| LLM latency issues | Medium | Medium | Streaming, caching |
| Security vulnerabilities | Critical | Medium | Regular audits, updates |
| Scope creep | Medium | High | Clear requirements, backlog |
| Team availability | High | Medium | Documentation, knowledge share |

### 6.2 Contingency Plans

| Scenario | Contingency Plan |
|----------|-----------------|
| Primary LLM unavailable | Auto-fallback to secondary LLM |
| Vector database down | Cache recent responses |
| Web search unavailable | RAG-only responses |
| Production incident | Rollback to previous version |

---

## 7. Quality Assurance

### 7.1 Code Quality Standards

```
Frontend:
- ESLint configuration
- Prettier formatting
- Component naming: PascalCase
- File naming: camelCase
- CSS: Tailwind utility classes

Backend:
- PEP 8 compliance
- Type hints required
- Docstrings for all functions
- Error handling with proper HTTP codes
```

### 7.2 Review Process

```
Code Changes:
1. Developer creates feature branch
2. Write/update tests
3. Local testing
4. Create pull request
5. Code review by peer
6. CI/CD pipeline runs
7. Merge to main
```

### 7.3 Testing Coverage Targets

| Component | Coverage Target |
|-----------|----------------|
| Backend API | 90% |
| RAG Service | 85% |
| Frontend Components | 80% |
| Overall | 85% |

---

## 8. Communication Plan

### 8.1 Meeting Schedule

| Meeting | Frequency | Attendees | Purpose |
|---------|-----------|-----------|---------|
| Daily Standup | Daily | All devs | Progress updates |
| Sprint Planning | Bi-weekly | All | Sprint goals |
| Review | Bi-weekly | All | Demo completed work |
| Retrospective | Bi-weekly | All | Improvements |
| Stakeholder Update | Weekly | PM, Stakeholders | Status report |

### 8.2 Progress Tracking

| Tool | Purpose |
|------|---------|
| GitHub Issues | Task tracking |
| GitHub Projects | Sprint management |
| Slack/Teams | Communication |
| This Document | Planning reference |

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

- [ ] Users can register and login with email
- [ ] Authenticated users can send chat messages
- [ ] AI responds with context-aware answers
- [ ] Users can view chat history
- [ ] Users can save/delete chats
- [ ] Users can update profile information
- [ ] Users can upload avatar
- [ ] Theme switching works correctly

### 9.2 Non-Functional Requirements

- [ ] Page load time < 3 seconds
- [ ] Chat response time < 5 seconds
- [ ] 99% uptime target
- [ ] Mobile responsive design
- [ ] Cross-browser compatibility
- [ ] Accessible UI

### 9.3 Launch Criteria

- [ ] All critical bugs resolved
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Stakeholder approval obtained

---

## 10. Appendices

### Appendix A: Environment Variables

```bash
# Backend (.env)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
COLLECTION_NAME=kca_documents
EMBEDDING_MODEL=all-MiniLM-L6-v2
GOOGLE_API_KEY=
CEREBRAS_API_KEY=
GROQ_API_KEY=
DEFAULT_LLM=groq
TAVILY_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Frontend (.env)
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Appendix B: API Endpoints Quick Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | / | Service status | No |
| GET | /health | Health check | No |
| POST | /chat | Send message | Yes |
| GET | /chat/stream | Stream response | Yes |
| GET | /chats | List chats | Yes |
| POST | /chats | Create chat | Yes |
| GET | /chats/{id} | Get chat | Yes |
| PUT | /chats/{id} | Update chat | Yes |
| DELETE | /chats/{id} | Delete chat | Yes |
| PUT | /user/profile | Update profile | Yes |
| POST | /user/avatar | Upload avatar | Yes |

### Appendix C: Database Schema

```sql
-- Supabase: chats table
CREATE TABLE public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Chat',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_saved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Qdrant: Collection for document embeddings
-- Collection: kca_documents
-- Vector size: 384 (all-MiniLM-L6-v2)
-- Distance metric: Cosine
```

### Appendix D: File Structure

```
final-year-proj/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── ingest.py            # Document ingestion script
│   ├── requirements.txt     # Python dependencies
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py    # Configuration
│   │   └── services/
│   │       ├── rag_service.py
│   │       ├── qdrant_service.py
│   │       └── web_search_service.py
│   └── migrations/
│       └── 001_create_chats_table.sql
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Auth.jsx
│   │   │   ├── UserProfile.jsx
│   │   │   └── ...
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   └── services/
│   │       └── api.js
│   └── package.json
├── docker-compose.yml
├── TEST_PLAN.md
├── IMPLEMENTATION_PLAN.md
└── README.md
```

---

**Document Prepared By:** Development Team  
**Version:** 1.0  
**Last Updated:** 2025  
**Next Review:** Week 4

