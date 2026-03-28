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

def test_contextual_expansion():
    print("Testing contextual expansion...")
    service = RagService()
    
    # Simulate a conversation about "Ethics and Leadership"
    history = [
        {"role": "user", "content": "tell me about ethics and leadership exam info"},
        {"role": "assistant", "content": "The Ethics and Leadership exam is scheduled for..."}
    ]
    query = "which date"
    
    expanded = service._contextualize_query(query, history)
    print(f"Original: '{query}', Expanded: '{expanded}'")
    # Expected: "ethics and leadership which date" (or similar)
    assert "ethics and leadership" in expanded.lower()

def test_date_time_rules_presence():
    print("\nTesting DATE_TIME_RULES presence in prompt...")
    service = RagService()
    service.llm = MagicMock()
    service.search = MagicMock(return_value=[MagicMock(page_content="test", metadata={})])
    
    service.get_answer("date for ethics and leadership")
    prompt_sent = service.llm.invoke.call_args[0][0]
    print("Prompt contains DATE AND TIME FORMATTING rule: ", "DATE AND TIME FORMATTING" in prompt_sent)
    assert "DATE AND TIME FORMATTING" in prompt_sent

def test_formatting_rules_presence():
    print("\nTesting refined formatting rules presence...")
    service = RagService()
    service.llm = MagicMock()
    service.search = MagicMock(return_value=[MagicMock(page_content="test", metadata={})])
    
    service.get_answer("test query")
    prompt_sent = service.llm.invoke.call_args[0][0]
    
    checks = {
        "Suppress empty labels": "NEVER print a field label",
        "Avoid generic boilerplate": "Avoid generic closing boilerplate",
        "Enforce bullet points for schedules": "USE BULLET POINTS for lists and schedules"
    }
    
    for name, snippet in checks.items():
        present = snippet in prompt_sent
        print(f"Prompt contains '{name}': {present}")
        assert present

if __name__ == "__main__":
    try:
        test_contextual_expansion()
        test_date_time_rules_presence()
        test_formatting_rules_presence()
        print("\nAll logical checks PASSED!")
    except AssertionError as e:
        print(f"\nAssertion failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
