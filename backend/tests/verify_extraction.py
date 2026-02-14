import sys
import os
import requests
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock URL - assuming backend is running on port 8000
BASE_URL = "http://127.0.0.1:8000"

# Sample file to upload
SAMPLE_TEXT = "This is a test document content for KCA University AI."
SAMPLE_FILENAME = "test_doc.txt"

def create_sample_file():
    with open(SAMPLE_FILENAME, "w") as f:
        f.write(SAMPLE_TEXT)
    print(f"Created {SAMPLE_FILENAME}")

def test_extraction():
    # Login not strictly needed if we mock or if we just want to test logic, 
    # but the endpoint is protected. 
    # For this script, we assume we might need a token, OR we can try to test the service logic directly
    # if the server isn't running. 
    # But let's assume the server IS NOT running and we want to test the SERVICE directly using the verified setup approach.
    pass

# Direct Service Test approach (like verify_setup.py)
import asyncio
from fastapi import UploadFile
from app.services.ingest_service import IngestService
from unittest.mock import MagicMock

async def test_service_extraction():
    print("Testing IngestService.extract_text_from_file...")
    
    service = IngestService()
    
    # Mock UploadFile
    class MockFile:
        def __init__(self, filename, content):
            self.filename = filename
            self.file = MagicMock()
            # Create a real temp file for shutil.copyfileobj to work if needed, 
            # or mock shutil. 
            # IngestService uses shutil.copyfileobj(file.file, tmp)
            # So file.file needs to be a file-like object.
            import io
            self.file = io.BytesIO(content.encode('utf-8'))

    mock_file = MockFile(SAMPLE_FILENAME, SAMPLE_TEXT)
    
    try:
        text = await service.extract_text_from_file(mock_file)
        print(f"Extracted Text: {text}")
        if text.strip() == SAMPLE_TEXT:
            print("✅ SUCCESS: Text extracted correctly.")
        else:
            print("❌ FAILURE: Text mismatch.")
            print(f"Expected: {SAMPLE_TEXT}")
            print(f"Got: {text}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_service_extraction())
