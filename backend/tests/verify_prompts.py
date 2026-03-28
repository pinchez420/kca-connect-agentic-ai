import sys
import os
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock EVERYTHING before importing RagService
mock_embeddings = MagicMock()
mock_qdrant_client = MagicMock()
mock_vector_store = MagicMock()
mock_ranker = MagicMock()
mock_qdrant_service = MagicMock()

with patch.dict(os.environ, {
    "GOOGLE_API_KEY": "fake_key",
    "SUPABASE_URL": "http://fake.url",
    "SUPABASE_ANON_KEY": "fake_anon",
    "QDRANT_URL": "http://fake.qdrant",
    "COLLECTION_NAME": "test_collection"
}):
    with patch('langchain_huggingface.HuggingFaceEmbeddings', return_value=mock_embeddings), \
         patch('qdrant_client.QdrantClient', return_value=mock_qdrant_client), \
         patch('langchain_qdrant.QdrantVectorStore', return_value=mock_vector_store), \
         patch('flashrank.Ranker', return_value=mock_ranker), \
         patch('app.services.qdrant_service.qdrant_service', mock_qdrant_service):
        
        from app.services.rag_service import RagService
        from app.core.prompts import RAG_SYSTEM_PROMPT, FALLBACK_PROMPT

def test_name_search_detection():
    print("Testing name search detection...")
    service = RagService()
    
    # Mock vector_store response
    service.vector_store.similarity_search_with_score = MagicMock(return_value=[(MagicMock(), 0.12)])
    
    query = "Griffin Kenga"
    should_use = service.should_use_rag(query)
    print(f"Query: '{query}', Should use RAG: {should_use} (Expected: True due to 0.12 > 0.10 threshold)")
    assert should_use == True

    query = "how to contact griffin"
    should_use = service.should_use_rag(query)
    print(f"Query: '{query}', Should use RAG: {should_use} (Expected: True due to 'contact' keyword)")
    assert should_use == True

def test_search_volume_k():
    print("\nTesting search volume (k) increases for contact queries...")
    service = RagService()
    service.llm = MagicMock()
    # Mock search to return empty list, but it will record k
    service.hybrid_search = MagicMock(return_value=[])
    
    # 1. Normal query
    service.get_answer("What is KCA?")
    # Check if hybrid_search was called with k=5
    called_k = service.hybrid_search.call_args[1].get('k')
    print(f"Normal query k: {called_k} (Expected: 5)")
    assert called_k == 5

    # 2. Contact query
    service.get_answer("how to contact griffin kenga")
    called_k = service.hybrid_search.call_args[1].get('k')
    print(f"Contact query k: {called_k} (Expected: 8)")
    assert called_k == 8

def test_prompt_unification():
    print("\nTesting prompt unification...")
    service = RagService()
    service.llm = MagicMock()
    # Mock hybrid_search to return a document so it proceeds to LLM
    service.hybrid_search = MagicMock(return_value=[MagicMock(page_content="test", metadata={})])
    
    # 1. RAG Path
    service.get_answer("how to contact griffin kenga")
    # In langchain, invoke is usually called with prompt
    prompt_sent = service.llm.invoke.call_args[0][0]
    print("RAG Prompt contains CONTACT INFORMATION HANDLING: ", "CONTACT INFORMATION HANDLING" in prompt_sent)
    assert "CONTACT INFORMATION HANDLING" in prompt_sent

    # 2. Fallback Path (Lower relevance)
    with patch.object(service, 'should_use_rag', return_value=False):
        service.get_answer("something random")
        prompt_sent = service.llm.invoke.call_args[0][0]
        print("Fallback Prompt contains CONTACT INFORMATION HANDLING: ", "CONTACT INFORMATION HANDLING" in prompt_sent)
        assert "CONTACT INFORMATION HANDLING" in prompt_sent

if __name__ == "__main__":
    try:
        test_name_search_detection()
        test_search_volume_k()
        test_prompt_unification()
        print("\nAll logical checks PASSED!")
    except AssertionError as e:
        print(f"\nAssertion failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
