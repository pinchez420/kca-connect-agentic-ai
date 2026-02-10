from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings

class QdrantService:
    def __init__(self):
        self.client = QdrantClient(url=settings.QDRANT_URL)
        self.collection_name = settings.COLLECTION_NAME

    def create_collection_if_not_exists(self, vector_size: int = 384):
        collections = self.client.get_collections()
        collection_names = [c.name for c in collections.collections]
        
        if self.collection_name not in collection_names:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                )
            )
            print(f"Collection '{self.collection_name}' created.")
        else:
            print(f"Collection '{self.collection_name}' already exists.")

    def get_retriever_store(self, embeddings):
        from langchain_community.vectorstores import Qdrant
        
        return Qdrant(
            client=self.client,
            collection_name=self.collection_name,
            embeddings=embeddings,
        )

qdrant_service = QdrantService()
