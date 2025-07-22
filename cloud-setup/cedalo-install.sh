#!/bin/bash

# Smart Bins R2 - Official Cedalo Streamsheets Installation
# Uses the official cedalo/installer for proper, stable deployment
# Based on official documentation: https://docs.cedalo.com/streamsheets/2.5/installation

set -e

echo "🚀 Smart Bins R2 - Official Cedalo Streamsheets Installation"
echo "Using official cedalo/installer for reliable deployment"
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

# Function to cleanup existing installation
cleanup_existing() {
    echo "🧹 Cleaning up any existing installations..."
    
    # Stop any running containers
    if [ -d "/root/cedalo_platform" ]; then
        cd /root/cedalo_platform
        if [ -f "stop.sh" ]; then
            echo "Stopping existing Cedalo platform..."
            sh stop.sh 2>/dev/null || true
        fi
        cd /root
    fi
    
    # Clean up our old custom installation
    if [ -f "docker-compose.yml" ]; then
        echo "Stopping old custom installation..."
        docker-compose down --remove-orphans 2>/dev/null || true
        docker-compose rm -f 2>/dev/null || true
    fi
    
    # Clean up volumes
    echo "Cleaning up old volumes..."
    docker volume rm smart-bins_streamsheets_data 2>/dev/null || true
    docker volume rm smart-bins_streamsheets_logs 2>/dev/null || true
    docker volume rm smart-bins_streamsheets_mongo 2>/dev/null || true
    docker volume rm smart-bins_mosquitto_data 2>/dev/null || true
    
    # System cleanup
    docker system prune -f 2>/dev/null || true
    
    echo "✅ Cleanup completed"
}

# Function to run official Cedalo installer
run_cedalo_installer() {
    echo "🎯 Running Official Cedalo Installer..."
    echo ""
    echo "📋 Installation Options:"
    echo "   ✅ Select: Eclipse Streamsheets"
    echo "   ✅ Select: Eclipse Mosquitto 2.0"
    echo "   ❌ Deselect: Management Center (optional for our use case)"
    echo ""
    echo "Use SPACE to select/deselect, ENTER to confirm"
    echo ""
    
    # Run the official installer for Linux
    docker run -it -v /root/cedalo_platform:/cedalo cedalo/installer:2-linux
    
    echo ""
    echo "✅ Official Cedalo installation completed!"
}

# Function to start services
start_services() {
    echo "🚀 Starting Cedalo Platform..."
    
    if [ ! -d "/root/cedalo_platform" ]; then
        echo "❌ Installation directory not found. Installation may have failed."
        exit 1
    fi
    
    cd /root/cedalo_platform
    
    if [ ! -f "start.sh" ]; then
        echo "❌ Start script not found. Installation may have failed."
        exit 1
    fi
    
    # Start services in background
    echo "Starting services..."
    nohup sh start.sh > streamsheets.log 2>&1 &
    
    echo "⏳ Waiting for services to start (60 seconds)..."
    sleep 60
    
    echo "✅ Services started!"
}

# Function to display results
show_results() {
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "your-server-ip")
    
    echo ""
    echo "🎉 Smart Bins R2 - Official Streamsheets Installation Complete!"
    echo ""
    echo "🔑 DEFAULT CREDENTIALS (CHANGE IMMEDIATELY):"
    echo "   Username: admin"
    echo "   Password: 1234"
    echo ""
    echo "🌐 ACCESS URLS:"
    echo "   Streamsheets Web UI: http://$SERVER_IP:8081"
    echo "   MQTT Broker:         $SERVER_IP:1883"
    echo ""
    echo "📋 WHAT WAS INSTALLED:"
    echo "   ✅ Official Cedalo Streamsheets platform"
    echo "   ✅ Eclipse Mosquitto MQTT broker"
    echo "   ✅ Proper authentication and persistence"
    echo "   ✅ No custom configurations to break"
    echo "   ✅ Standard, supported setup"
    echo ""
    echo "🔒 SECURITY REMINDER:"
    echo "   1. Login to http://$SERVER_IP:8081"
    echo "   2. Use admin/1234 to login"
    echo "   3. Go to Administration → Users → Change Password"
    echo "   4. Set a strong password immediately!"
    echo ""
    echo "🎯 FOR SMART BINS PROJECT:"
    echo "   1. ESP32 scales connect to: $SERVER_IP:1883"
    echo "   2. Edge-processor connects to: $SERVER_IP:1883"
    echo "   3. Create inventory dashboards in Streamsheets"
    echo "   4. Use built-in MQTT broker (no separate broker needed)"
    echo ""
    echo "🔧 MANAGEMENT COMMANDS:"
    echo "   Start:  cd /root/cedalo_platform && sh start.sh"
    echo "   Stop:   cd /root/cedalo_platform && sh stop.sh"
    echo "   Update: cd /root/cedalo_platform && sh update.sh"
    echo "   Logs:   cd /root/cedalo_platform && tail -f streamsheets.log"
    echo ""
    echo "📞 SUPPORT:"
    echo "   This is the official Cedalo installation method"
    echo "   Documentation: https://docs.cedalo.com/streamsheets/2.5/installation"
    echo "   No custom configurations - standard behavior"
    echo ""
}

# Main installation function
main() {
    echo "🔍 System Check Phase"
    check_root
    
    echo ""
    echo "📦 Docker Installation Phase"
    install_docker
    check_docker_service
    
    echo ""
    echo "🧹 Cleanup Phase"
    cleanup_existing
    
    echo ""
    echo "🎯 Official Installation Phase"
    run_cedalo_installer
    
    echo ""
    echo "🚀 Service Startup Phase"
    start_services
    
    echo ""
    echo "📊 Results"
    show_results
}

# Check if user wants to proceed
echo "⚠️  This script will:"
echo "- Install Docker (if needed)"
echo "- Clean up any existing Streamsheets installations"
echo "- Run the official Cedalo installer (interactive)"
echo "- Start the Streamsheets platform"
echo ""
echo "📋 You will be prompted to select components during installation"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

# Run main installation
main

echo "🏁 Official Cedalo Streamsheets installation completed successfully!"
echo ""
echo "🎯 Next: Configure your Smart Bins devices to connect to the MQTT broker"
