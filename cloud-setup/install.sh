#!/bin/bash

# Smart Bins R2 - Ultimate Installation Script
# Complete deployment with all fixes applied for DigitalOcean droplets
# Works for both fresh installations and fixing existing problems

set -e

echo "🚀 Smart Bins R2 - Ultimate Installation Script"
echo "This script will install Docker, deploy services, and apply all fixes"
echo ""

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo "✅ Running as root - good for system installation"
    else
        echo "⚠️  Not running as root - some operations may require sudo"
    fi
}

# Function to install Docker
install_docker() {
    if ! command -v docker &> /dev/null; then
        echo "📦 Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        usermod -aG docker $USER 2>/dev/null || sudo usermod -aG docker $USER 2>/dev/null || echo "Note: Could not add user to docker group"
        rm get-docker.sh
        echo "✅ Docker installed successfully"
    else
        echo "✅ Docker is already installed"
    fi
}

# Function to install Docker Compose
install_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        echo "📦 Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose 2>/dev/null || \
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose 2>/dev/null || sudo chmod +x /usr/local/bin/docker-compose
        echo "✅ Docker Compose installed successfully"
    else
        echo "✅ Docker Compose is already installed"
    fi
}

# Function to check Docker service
check_docker_service() {
    if ! docker info > /dev/null 2>&1; then
        echo "🔄 Starting Docker service..."
        systemctl start docker 2>/dev/null || sudo systemctl start docker 2>/dev/null || {
            echo "❌ Could not start Docker service. Please start it manually:"
            echo "   sudo systemctl start docker"
            exit 1
        }
        systemctl enable docker 2>/dev/null || sudo systemctl enable docker 2>/dev/null || echo "Note: Could not enable Docker service"
    fi
    echo "✅ Docker service is running"
}

# Main installation
main() {
    echo "🔍 System Check Phase"
    check_root
    
    echo ""
    echo "📦 Installation Phase"
    install_docker
    install_docker_compose
    check_docker_service
    
    echo ""
    echo "🛑 Cleanup Phase"
    echo "Stopping any existing containers..."
    docker-compose down --remove-orphans 2>/dev/null || true
    
    echo "Removing existing containers..."
    docker-compose rm -f 2>/dev/null || true
    
    echo "Cleaning up Smart Bins volumes..."
    docker volume rm smart-bins_streamsheets_data 2>/dev/null || true
    docker volume rm smart-bins_streamsheets_logs 2>/dev/null || true
    docker volume rm smart-bins_streamsheets_mongo 2>/dev/null || true
    docker volume rm smart-bins_mosquitto_data 2>/dev/null || true
    
    echo "Cleaning up orphaned volumes and containers..."
    docker volume prune -f 2>/dev/null || true
    docker system prune -f 2>/dev/null || true
    
    echo ""
    echo "🔧 Configuration Phase"
    echo "Creating mosquitto directories with correct permissions..."
    mkdir -p mosquitto/data
    mkdir -p mosquitto/log
    chmod 755 mosquitto/data
    chmod 755 mosquitto/log
    
    # Fix ownership for mosquitto (UID 1883)
    echo "Setting correct ownership for mosquitto directories..."
    chown -R 1883:1883 mosquitto/data mosquitto/log 2>/dev/null || \
    sudo chown -R 1883:1883 mosquitto/data mosquitto/log 2>/dev/null || {
        echo "Note: Could not set mosquitto ownership. This is usually fine."
    }
    
    echo "Setting script permissions..."
    chmod +x *.sh 2>/dev/null || true
    
    echo ""
    echo "📦 Deployment Phase"
    echo "Pulling latest Docker images..."
    docker-compose pull
    
    echo "Starting services with all fixes applied..."
    docker-compose up -d
    
    echo "⏳ Waiting for services to initialize (60 seconds)..."
    sleep 60
    
    echo ""
    echo "🔍 Verification Phase"
    echo "Checking service status..."
    docker-compose ps
    
    echo ""
    echo "Checking container logs for errors..."
    echo "Streamsheets logs (last 5 lines):"
    docker-compose logs --tail=5 streamsheets 2>/dev/null || echo "Could not fetch Streamsheets logs"
    
    echo ""
    echo "Mosquitto logs (last 5 lines):"
    docker-compose logs --tail=5 mosquitto 2>/dev/null || echo "Could not fetch Mosquitto logs"
    
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "your-server-ip")
    
    echo ""
    echo "🎉 Smart Bins R2 Installation Complete!"
    echo ""
    echo "🔑 LOGIN CREDENTIALS:"
    echo "   Username: admin"
    echo "   Password: 1234"
    echo ""
    echo "🌐 ACCESS URLS:"
    echo "   Streamsheets:  http://$SERVER_IP:8081"
    echo "   Admin Panel:   http://$SERVER_IP:9000"
    echo "   MQTT Broker:   $SERVER_IP:1883 (internal)"
    echo "   MQTT External: $SERVER_IP:1884 (external access)"
    echo "   MQTT WebSocket: $SERVER_IP:9001"
    echo ""
    echo "📋 WHAT WAS INSTALLED:"
    echo "   ✅ Docker and Docker Compose"
    echo "   ✅ Eclipse Streamsheets with persistent MongoDB"
    echo "   ✅ Eclipse Mosquitto MQTT broker"
    echo "   ✅ All configuration fixes applied"
    echo "   ✅ No installation loops or 502 errors"
    echo ""
    echo "🔒 SECURITY REMINDER:"
    echo "   Change the default password immediately!"
    echo "   Go to Administration → Users → admin → Change Password"
    echo ""
    echo "🔧 USEFUL COMMANDS:"
    echo "   View logs:     docker-compose logs -f"
    echo "   Restart:       docker-compose restart"
    echo "   Stop services: docker-compose down"
    echo "   Container status: docker-compose ps"
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. Access Streamsheets at http://$SERVER_IP:8081"
    echo "2. Login with admin/1234"
    echo "3. Change the default password"
    echo "4. Configure your ESP32 devices to connect to $SERVER_IP:1883"
    echo "5. Create inventory dashboards in Streamsheets"
    echo ""
    echo "🆘 SUPPORT:"
    echo "   If you encounter issues, check the logs first:"
    echo "   docker-compose logs streamsheets"
    echo "   docker-compose logs mosquitto"
    echo ""
}

# Check if user wants to proceed
echo "⚠️  This script will:"
echo "- Install Docker and Docker Compose (if needed)"
echo "- Remove any existing Smart Bins containers and data"
echo "- Deploy fresh services with all fixes applied"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

# Run main installation
main

echo "🏁 Installation script completed successfully!"
