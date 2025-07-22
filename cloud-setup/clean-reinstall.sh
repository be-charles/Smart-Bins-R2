#!/bin/bash

# Smart Bins R2 - Complete Clean Reinstall Script
# This script performs a complete cleanup and reinstall with all fixes applied

set -e

echo "🧹 Smart Bins R2 - Complete Clean Reinstall"
echo "This will completely remove all containers, volumes, and data, then reinstall fresh"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "⚠️  WARNING: This will completely remove all existing data!"
echo "- All containers will be stopped and removed"
echo "- All volumes will be deleted (including any existing data)"
echo "- Fresh installation will be performed"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo ""
echo "🛑 Phase 1: Complete Cleanup"
echo "Stopping all containers..."
docker-compose down --remove-orphans || true

echo "Removing all containers..."
docker-compose rm -f || true

echo "Removing all Smart Bins volumes..."
docker volume rm smart-bins_streamsheets_data 2>/dev/null || true
docker volume rm smart-bins_streamsheets_logs 2>/dev/null || true
docker volume rm smart-bins_streamsheets_mongo 2>/dev/null || true
docker volume rm smart-bins_mosquitto_data 2>/dev/null || true

echo "Cleaning up any orphaned volumes..."
docker volume prune -f

echo "Cleaning up orphaned containers and networks..."
docker system prune -f

echo ""
echo "🔧 Phase 2: Fix Configuration"
echo "Creating mosquitto directories with correct permissions..."
mkdir -p mosquitto/data
mkdir -p mosquitto/log
chmod 755 mosquitto/data
chmod 755 mosquitto/log

# Fix ownership for mosquitto (UID 1883)
echo "Setting correct ownership for mosquitto directories..."
sudo chown -R 1883:1883 mosquitto/data mosquitto/log 2>/dev/null || {
    echo "Note: Could not set mosquitto ownership (running as non-root). This is usually fine."
}

echo "Setting script permissions..."
chmod +x deploy.sh
chmod +x fix-streamsheets.sh
chmod +x clean-reinstall.sh

echo ""
echo "📦 Phase 3: Fresh Installation"
echo "Pulling latest Docker images..."
docker-compose pull

echo "Starting services with fixed configuration..."
docker-compose up -d

echo "⏳ Waiting for services to initialize..."
sleep 45

echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "🔍 Checking container logs for errors..."
echo "Streamsheets logs (last 10 lines):"
docker-compose logs --tail=10 streamsheets

echo ""
echo "Mosquitto logs (last 10 lines):"
docker-compose logs --tail=10 mosquitto

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")

echo ""
echo "✅ Clean Reinstall Complete!"
echo ""
echo "🔑 LOGIN CREDENTIALS:"
echo "   Username: admin"
echo "   Password: changeme123"
echo ""
echo "🌐 Access URLs:"
echo "   Streamsheets: http://$SERVER_IP:8080"
echo "   Admin Panel:  http://$SERVER_IP:9000"
echo ""
echo "📋 What was installed:"
echo "   ✓ Fresh Streamsheets with persistent MongoDB volume"
echo "   ✓ Fixed admin credentials (no more password resets)"
echo "   ✓ Mosquitto MQTT broker with proper permissions"
echo "   ✓ All volumes properly configured for persistence"
echo ""
echo "🔒 IMPORTANT: Change the default password after logging in!"
echo "   Go to Administration → Users → admin → Change Password"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Restart:       docker-compose restart"
echo "   Stop services: docker-compose down"
echo ""
echo "🎯 Next Steps:"
echo "1. Access Streamsheets at http://$SERVER_IP:8080"
echo "2. Login with admin/changeme123"
echo "3. Change the default password"
echo "4. Create your inventory dashboards"
echo ""
