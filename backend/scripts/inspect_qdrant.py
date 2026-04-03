import asyncio
import sys
import os
from qdrant_client.http import models

# Add the parent directory to sys.path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ingest_service import ingest_service
from app.core.config import settings

async def search_text(query: str):
    print(f"Searching for '{query}' in {settings.COLLECTION_NAME}...")
    
    # Scroll through points to find matches in payload
    offset = None
    matches = []
    
    while True:
        response = ingest_service.client.scroll(
            collection_name=settings.COLLECTION_NAME,
            limit=100,
            with_payload=True,
            with_vectors=False,
            offset=offset
        )
        points, offset = response
        
        for point in points:
            content = str(point.payload.get("page_content", ""))
            if query.lower() in content.lower():
                matches.append({
                    "source": point.payload.get("metadata", {}).get("source"),
                    "snippet": content[:200] + "..."
                })
        
        if offset is None:
            break
            
    if matches:
        print(f"\nFound {len(matches)} matches:")
        for idx, match in enumerate(matches, 1):
            print(f"{idx}. Source: {match['source']}")
            print(f"   Snippet: {match['snippet']}\n")
    else:
        print("No matches found.")

async def main():
    if len(sys.argv) < 2:
        print("Usage: python3 inspect_qdrant.py <text_to_search>")
        return
    
    query = " ".join(sys.argv[1:])
    await search_text(query)

if __name__ == "__main__":
    asyncio.run(main())
