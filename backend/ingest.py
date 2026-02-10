import os
import glob
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings

def ingest_docs():
    # 1. Load Documents
    pdf_files = glob.glob("../pdf documents/*.pdf")
    documents = []
    for pdf_file in pdf_files:
        print(f"Loading {pdf_file}...")
        loader = PyPDFLoader(pdf_file)
        documents.extend(loader.load())

    if not documents:
        print("No documents found to ingest.")
        return

    # 2. Split Text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    )
    texts = text_splitter.split_documents(documents)
    print(f"Split into {len(texts)} chunks.")

    # 3. Create/Reset Collection
    client = QdrantClient(url=settings.QDRANT_URL)
    
    # Check if collection exists
    collections = client.get_collections()
    if settings.COLLECTION_NAME not in [c.name for c in collections.collections]:
        client.create_collection(
            collection_name=settings.COLLECTION_NAME,
            vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
        )
        print(f"Created collection {settings.COLLECTION_NAME}")

    # 4. Indexes
    embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
    
    QdrantVectorStore.from_documents(
        texts,
        embeddings,
        url=settings.QDRANT_URL,
        collection_name=settings.COLLECTION_NAME,
    )
    print("Ingestion complete!")

if __name__ == "__main__":
    ingest_docs()
