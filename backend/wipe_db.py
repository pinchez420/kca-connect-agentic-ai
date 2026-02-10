from qdrant_client import QdrantClient
from app.core.config import settings
import sys

def wipe_collection():
    client = QdrantClient(url=settings.QDRANT_URL)
    
    print(f"Connecting to Qdrant at {settings.QDRANT_URL}...")
    
    try:
        collections = client.get_collections()
        if settings.COLLECTION_NAME in [c.name for c in collections.collections]:
            print(f"Deleting collection: {settings.COLLECTION_NAME}...")
            client.delete_collection(collection_name=settings.COLLECTION_NAME)
            print("Successfully wiped existing embeddings.")
        else:
            print(f"Collection {settings.COLLECTION_NAME} not found. Nothing to wipe.")
    except Exception as e:
        print(f"Error while wiping collection: {e}")
        sys.exit(1)

if __name__ == "__main__":
    wipe_collection()
