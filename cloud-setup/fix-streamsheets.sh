#!/bin/bash

# Smart Bins R2 - Streamsheets Recovery Script
# This script fixes the installation loop issue by cleaning up and redeploying

set -e

echo "🔧 Smart Bins R2 - Streamsheets Recovery Script"
echo "This will fix the installation loop issue and set persistent credentials"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "⚠️  WARNING: This will stop all containers and remove orphaned volumes"
echo "Your MQTT data and logs will be preserved, but you'll need to reconfigure Streamsheets"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo ""
echo "🛑 Stopping existing containers..."
docker-compose down

echo "🗑️  Removing containers and orphaned volumes..."
docker-compose rm -svf mongodb streamsheets || true

echo "🧹 Cleaning up anonymous MongoDB volumes..."
docker volume prune -f

echo "📦 Pulling latest images..."
docker-compose pull

echo "🚀 Starting services with fixed configuration..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 30

echo "🔍 Checking service status..."
docker-compose ps

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")

echo ""
echo "✅ Streamsheets Recovery Complete!"
echo ""
echo "🔑 NEW LOGIN CREDENTIALS:"
echo "   Username: admin"
echo "   Password: changeme123"
echo ""
echo "🌐 Access URLs:"
echo "   Streamsheets: http://$SERVER_IP:8080"
echo "   Admin Panel:  http://$SERVER_IP:9000"
echo ""
echo "📋 What was fixed:"
echo "   ✓ Added persistent MongoDB volume to all-in-one container"
echo "   ✓ Set fixed admin credentials to prevent password resets"
echo "   ✓ Removed anonymous volumes that caused the installation loop"
echo "   ✓ Fixed 502 Bad Gateway errors from service separation issues"
echo ""
echo "🔒 IMPORTANT: Change the default password after logging in!"
echo "   Go to Administration → Users → admin → Change Password"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Restart:       docker-compose restart"
echo "   Stop services: docker-compose down"
echo ""
