#!/bin/bash

# Smart Bins R2 - Mosquitto Fix Script
# This script fixes the Mosquitto PID file issue and restarts the container

set -e

echo "🔧 Smart Bins R2 - Mosquitto Fix"
echo "This will restart the Mosquitto container with the fixed configuration"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "🛑 Stopping Mosquitto container..."
docker-compose stop mosquitto

echo "🗑️  Removing Mosquitto container..."
docker-compose rm -f mosquitto

echo "🚀 Starting Mosquitto with fixed configuration..."
docker-compose up -d mosquitto

echo "⏳ Waiting for Mosquitto to start..."
sleep 10

echo "🔍 Checking Mosquitto status..."
docker-compose ps mosquitto

echo ""
echo "📋 Checking Mosquitto logs..."
docker-compose logs --tail=10 mosquitto

echo ""
echo "✅ Mosquitto Fix Complete!"
echo ""
echo "🔍 What was fixed:"
echo "   ✓ Removed PID file directive that caused permission errors"
echo "   ✓ Mosquitto should now run without restart loops"
echo ""
echo "🌐 Mosquitto Services:"
echo "   MQTT:      Port 1884 (external access)"
echo "   WebSocket: Port 9001"
echo ""
echo "🔧 Test MQTT connection:"
echo "   mosquitto_pub -h your-droplet-ip -p 1884 -t test/topic -m 'Hello World'"
echo "   mosquitto_sub -h your-droplet-ip -p 1884 -t test/topic"
echo ""
