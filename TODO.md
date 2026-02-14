# TODO: Implement User Profile Access for AI

## Task: Enable AI to understand user profile info and answer questions like "what is my mode of study?"

### Steps:
- [ ] 1. Update frontend API (`api.js`) - Pass user metadata with chat requests
- [ ] 2. Update backend chat endpoint (`main.py`) - Accept user metadata
- [ ] 3. Update RAG service (`rag_service.py`) - Include user profile in system prompt
- [ ] 4. Test the implementation

### Implementation Details:
1. **Frontend**: Modify `chatWithAgentStream` to include `user_metadata` from the authenticated user context
2. **Backend**: Add optional `user_metadata` parameter to ChatRequest, pass to RAG service
3. **RAG Service**: Add user profile context to system prompt template
