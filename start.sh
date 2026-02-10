#!/bin/bash

# Quick Start Script - Run this after setup.sh
# This script ingests documents and opens the application

set -e

echo "🚀 KCA Connect AI - Quick Start"
echo "================================"
echo ""

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "⚠️  Services not running. Starting them..."
    docker-compose up -d
    echo "Waiting for services to be ready..."
    sleep 10
fi

echo "✅ Services are running"
echo ""

# Check if we're in a virtual environment for ingestion
echo "📚 Ingesting documents..."
cd backend

if [ -f ingest.py ]; then
    if [ -d .venv ]; then
        echo "Using virtual environment..."
        source .venv/bin/activate
        python ingest.py
        deactivate
    else
        echo "⚠️  Virtual environment not found. Using system Python..."
        python3 ingest.py
    fi
    echo "✅ Documents ingested successfully!"
else
    echo "⚠️  ingest.py not found. Skipping document ingestion."
fi

cd ..

echo ""
echo "🎉 All set! Opening application..."
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"
echo ""

# Try to open browser (works on most Linux desktop environments)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173 2>/dev/null || true
elif command -v gnome-open &> /dev/null; then
    gnome-open http://localhost:5173 2>/dev/null || true
fi

echo "Happy chatting! 🎓"
