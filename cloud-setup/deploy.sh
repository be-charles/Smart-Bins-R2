#!/bin/bash

# Smart Bins R2 - Cloud Deployment Script
# Deploy Eclipse Streamsheets to DigitalOcean Droplet

set -e

echo "🚀 Starting Smart Bins R2 Cloud Deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. Please log out and back in, then run this script again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed."
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p mosquitto/data
mkdir -p mosquitto/log
sudo chown -R 1883:1883 mosquitto/data mosquitto/log

# Set executable permissions
chmod +x deploy.sh

# Pull latest images
echo "📦 Pulling Docker images..."
docker-compose pull

# Stop existing containers if running
echo "🛑 Stopping existing containers..."
docker-compose down

# Start services
echo "🚀 Starting Smart Bins services..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose ps

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

echo ""
echo "✅ Smart Bins R2 Cloud Services Deployed Successfully!"
echo ""
echo "🌐 Access URLs:"
echo "   Streamsheets Dashboard: http://$SERVER_IP:8080"
echo "   Streamsheets Admin:     http://$SERVER_IP:9000"
echo "   MQTT Broker:           $SERVER_IP:1883"
echo "   MQTT WebSocket:        $SERVER_IP:9001"
echo ""
echo "📋 Next Steps:"
echo "1. Configure your edge nodes to connect to: $SERVER_IP:1883"
echo "2. Access Streamsheets at http://$SERVER_IP:8080"
echo "3. Create inventory dashboards in Streamsheets"
echo "4. Update your ESP32 firmware with the server IP"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:      docker-compose restart"
echo ""
