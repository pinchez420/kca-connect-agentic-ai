#!/bin/bash

# Setup Script for KCA Connect Agentic AI
# This script helps you set up the project quickly

set -e  # Exit on error

echo "🚀 KCA Connect AI - Setup Script"
echo "=================================="

# Check for required tools
echo ""
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Setup backend environment
echo ""
echo "⚙️  Setting up backend environment..."
cd backend

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo ""
    echo "⚠️  IMPORTANT: Please edit backend/.env and add your Google API key!"
    echo "   Visit https://makersuite.google.com/app/apikey to get your key"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Check if API key is configured
if grep -q "your_google_api_key_here" .env; then
    echo ""
    echo "⚠️  WARNING: Google API key not configured!"
    echo "   Please edit backend/.env and replace 'your_google_api_key_here' with your actual API key"
    echo ""
fi

cd ..

# Build and start services
echo ""
echo "🔨 Building and starting Docker services..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose up -d --build

echo ""
echo "✅ Services are starting..."
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📍 Access points:"
echo "   Frontend:        http://localhost:5173"
echo "   Backend API:     http://localhost:8000"
echo "   API Docs:        http://localhost:8000/docs"
echo "   Health Check:    http://localhost:8000/health"
echo "   Qdrant:          http://localhost:6333/dashboard"
echo ""
echo "📚 Next steps:"
echo "   1. Make sure you've configured GOOGLE_API_KEY in backend/.env"
echo "   2. Ingest documents: cd backend && python ingest.py"
echo "   3. Open http://localhost:5173 and start chatting!"
echo ""
echo "💡 Useful commands:"
echo "   Stop services:   docker-compose down"
echo "   View logs:       docker-compose logs -f"
echo "   Restart:         docker-compose restart"
echo ""
