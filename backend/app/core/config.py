import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    COLLECTION_NAME: str = "kca_documents"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")
    DEFAULT_LLM: str = os.getenv("DEFAULT_LLM", "gemini")  # Options: 'gemini', 'cerebras'

    class Config:

        env_file = ".env"

settings = Settings()
