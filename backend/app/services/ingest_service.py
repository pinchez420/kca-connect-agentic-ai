import os
import shutil
import tempfile
from fastapi import UploadFile, HTTPException
from langchain_community.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings
import logging
import re

logger = logging.getLogger(__name__)

class IngestService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
        self.client = QdrantClient(url=settings.QDRANT_URL)
        self.vector_store = QdrantVectorStore(
            client=self.client,
            collection_name=settings.COLLECTION_NAME,
            embedding=self.embeddings,
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=300,
            add_start_index=True,
        )

    async def extract_text_from_file(self, file: UploadFile) -> str:
        """
        Extract text from a file without ingesting it.
        """
        try:
            suffix = os.path.splitext(file.filename)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                shutil.copyfileobj(file.file, tmp)
                tmp_path = tmp.name

            try:
                documents = []
                if suffix.lower() == ".pdf":
                    loader = PyPDFLoader(tmp_path)
                    documents = loader.load()
                elif suffix.lower() == ".docx":
                    loader = Docx2txtLoader(tmp_path)
                    documents = loader.load()
                elif suffix.lower() == ".txt":
                    loader = TextLoader(tmp_path, encoding="utf-8")
                    documents = loader.load()
                else:
                   raise ValueError(f"Unsupported file type: {suffix}")

                if not documents:
                    return ""

                return "\n\n".join([self._clean_text(doc.page_content) for doc in documents])

            finally:
                if os.path.exists(tmp_path):
                    # Reset file cursor for subsequent operations if needed, 
                    # though here we consumed the upload file stream.
                    # Fastapi UploadFile might need seek(0) if reused.
                    pass
                    os.remove(tmp_path)

        except Exception as e:
            logger.error(f"Error extracting text from {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

    def _clean_text(self, text: str) -> str:
        """
        Clean extracted text to fix common PDF extraction artifacts.
        e.g. "wordWord" -> "word Word", "end.Start" -> "end. Start"
        """
        if not text:
            return ""
            
        # 1. Normalization: paragraphs
        text = re.sub(r'\n\s*\n', '<PARAGRAPH>', text)
        
        # 2. Unwrap single newlines
        text = re.sub(r'\n', ' ', text)
        
        # 3. Restore paragraphs
        text = text.replace('<PARAGRAPH>', '\n\n')
            
        # 4. Fix camelCase-like merges
        text = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', text)
        
        # 5. Fix UpperTitle merges (e.g. SYSTEMSIf -> SYSTEMS If)
        text = re.sub(r'(?<=[A-Z])(?=[A-Z][a-z])', ' ', text)
        
        # 6. Fix period followed by Uppercase (e.g. ac.keHe -> ac.ke He)
        text = re.sub(r'(?<=[a-z]\.)(?=[A-Z])', ' ', text)
        
        # 7. Collapse multiple spaces
        text = re.sub(r'[ \t]+', ' ', text)
        
        return text.strip()

    async def process_file(self, file: UploadFile, user_id: str):
        """
        Process an uploaded file: save to temp, load, split, and ingest.
        """
        try:
            # Create a temporary file to save the upload
            suffix = os.path.splitext(file.filename)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                shutil.copyfileobj(file.file, tmp)
                tmp_path = tmp.name

            try:
                documents = []
                # Determine loader based on file extension
                if suffix.lower() == ".pdf":
                    loader = PyPDFLoader(tmp_path)
                    documents = loader.load()
                elif suffix.lower() == ".docx":
                    loader = Docx2txtLoader(tmp_path)
                    documents = loader.load()
                elif suffix.lower() == ".txt":
                    loader = TextLoader(tmp_path, encoding="utf-8")
                    documents = loader.load()
                else:
                    # For images, we would use a Vision model here.
                    # For now, we skip unsupported types or implement image handling later.
                    logger.warning(f"Unsupported file type: {suffix}")
                    return {"success": False, "message": f"Unsupported file type: {suffix}"}

                if not documents:
                    return {"success": False, "message": "No content found in file."}

                # Add metadata and Clean Text
                for doc in documents:
                    doc.page_content = self._clean_text(doc.page_content)
                    doc.metadata["source"] = file.filename
                    doc.metadata["user_id"] = user_id
                    doc.metadata["type"] = "upload"

                # Split text
                texts = self.text_splitter.split_documents(documents)
                
                if not texts:
                     return {"success": False, "message": "Could not split documents."}

                # Ingest into Qdrant
                self.vector_store.add_documents(texts)
                
                logger.info(f"Ingested {len(texts)} chunks from {file.filename}")
                return {
                    "success": True, 
                    "chunks": len(texts)
                }

            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        except Exception as e:
            logger.error(f"Error processing file {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

ingest_service = IngestService()
