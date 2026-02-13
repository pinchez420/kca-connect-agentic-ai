import os
import glob
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings

def ingest_docs():
    # 1. Load Documents (TXT files)
    txt_files = glob.glob("../pdf documents/*.txt")
    documents = []
    
    for txt_file in txt_files:
        print(f"Loading {txt_file}...")
        loader = TextLoader(txt_file, encoding='utf-8')
        documents.extend(loader.load())

    if not documents:
        print("No documents found to ingest.")
        return

    # 2. Split Text - First by Markdown Headers to preserve context
    # Define headers to split on
    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
        ("####", "Header 4"),
    ]
    
    markdown_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on,
        strip_headers=False  # Keep headers in the content
    )
    
    # First pass: split by markdown headers
    md_splits = []
    for doc in documents:
        splits = markdown_splitter.split_text(doc.page_content)
        for split in splits:
            # Add source metadata
            split.metadata["source"] = os.path.basename(doc.metadata.get("source", "unknown"))
        md_splits.extend(splits)
    
    print(f"Split by headers into {len(md_splits)} sections.")
    
    # Second pass: split large sections into smaller chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        add_start_index=True,  # Helps track where chunks come from
    )
    
    texts = text_splitter.split_documents(md_splits)
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

