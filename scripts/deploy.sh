#!/bin/bash

# AI Dungeon Master Deployment Script
# This script deploys the application to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ai-dungeon-master"
COMPOSE_FILE="docker-compose.prod.yml"

echo -e "${GREEN}🚀 Starting AI Dungeon Master deployment...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed. Please install it and try again.${NC}"
    exit 1
fi

# Check environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY is not set. Please set it before deployment.${NC}"
    echo "export OPENAI_API_KEY=your_api_key_here"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p logs
mkdir -p nginx/ssl

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
docker-compose -f $COMPOSE_FILE down --remove-orphans
docker-compose -f $COMPOSE_FILE build --no-cache
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 30

# Check service health
echo -e "${YELLOW}🔍 Checking service health...${NC}"

# Check Redis
if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${RED}❌ Redis is not healthy${NC}"
    exit 1
fi

# Check Backend
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend is not healthy${NC}"
    exit 1
fi

# Check Frontend
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend is not healthy${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}📱 Frontend: http://localhost:80${NC}"
echo -e "${GREEN}🔧 Backend API: http://localhost:3001${NC}"
echo -e "${GREEN}📊 Health Check: http://localhost:3001/api/health${NC}"

# Show logs
echo -e "${YELLOW}📋 Recent logs:${NC}"
docker-compose -f $COMPOSE_FILE logs --tail=20
