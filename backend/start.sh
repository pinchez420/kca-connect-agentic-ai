#!/bin/bash

echo "Starting KCA Connect Backend..."
echo ""

# Activate virtual environment
source .venv/bin/activate

# Check if dependencies are installed
python -c "import torch; import sentence_transformers; import langchain" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Dependencies not fully installed."
    echo "Please install the remaining packages first:"
    echo "  pip install -r requirements.txt"
    exit 1
fi

# Check if Qdrant is running
curl -s http://localhost:6333/collections >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Qdrant is not running on port 6333."
    echo "Please start Qdrant first:"
    echo "  docker run -d --name qdrant -p 6333:6333 qdrant/qdrant"
    exit 1
fi

echo "✅ Dependencies check passed"
echo "✅ Qdrant is running"
echo ""
echo "Starting FastAPI server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
