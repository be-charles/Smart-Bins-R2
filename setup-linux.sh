#!/bin/bash

# Smart Bins MQTT Broker Setup (Linux/Raspberry Pi)
# This script sets up Mosquitto MQTT broker for the Smart Bins system

set -e  # Exit on any error

echo "========================================"
echo "Smart Bins MQTT Broker Setup (Linux)"
echo "========================================"
echo

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "WARNING: Running as root. Consider running as regular user with sudo."
   echo "Press Enter to continue or Ctrl+C to exit..."
   read
fi

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "Cannot detect Linux distribution"
    exit 1
fi

echo "Detected OS: $OS $VER"
echo

echo "[1/7] Updating package lists..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update
elif command -v yum &> /dev/null; then
    sudo yum update -y
elif command -v dnf &> /dev/null; then
    sudo dnf update -y
else
    echo "Unsupported package manager. Please install Mosquitto manually."
    exit 1
fi

echo "[2/7] Installing Mosquitto MQTT Broker..."
if command -v apt-get &> /dev/null; then
    sudo apt-get install -y mosquitto mosquitto-clients
elif command -v yum &> /dev/null; then
    sudo yum install -y mosquitto mosquitto-clients
elif command -v dnf &> /dev/null; then
    sudo dnf install -y mosquitto mosquitto-clients
fi

echo "[3/7] Stopping Mosquitto service for configuration..."
sudo systemctl stop mosquitto || true

echo "[4/7] Creating Mosquitto configuration..."
sudo mkdir -p /etc/mosquitto/conf.d
sudo mkdir -p /var/log/mosquitto
sudo mkdir -p /var/lib/mosquitto

# Create main configuration file
sudo tee /etc/mosquitto/conf.d/smart-bins.conf > /dev/null << EOF
# Mosquitto MQTT Broker Configuration for Smart Bins
# Generated by Smart Bins setup script

# Network Configuration
listener 1883
protocol mqtt

# Security Configuration
allow_anonymous false
password_file /etc/mosquitto/passwd

# Logging Configuration
log_dest file /var/log/mosquitto/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
connection_messages true
log_timestamp true

# Persistence
persistence true
persistence_location /var/lib/mosquitto/
EOF

echo "[5/7] Setting up file permissions..."
sudo chown mosquitto:mosquitto /var/log/mosquitto
sudo chown mosquitto:mosquitto /var/lib/mosquitto
sudo chmod 755 /var/log/mosquitto
sudo chmod 755 /var/lib/mosquitto

echo "[6/7] Creating MQTT users..."
echo "Creating user 'esp32_user' for ESP32 devices..."
echo "Please enter a secure password for esp32_user:"
sudo mosquitto_passwd -c /etc/mosquitto/passwd esp32_user

echo
echo "Creating user 'edge_processor' for edge processor..."
echo "Please enter a secure password for edge_processor:"
sudo mosquitto_passwd /etc/mosquitto/passwd edge_processor

# Set correct permissions for password file
sudo chown mosquitto:mosquitto /etc/mosquitto/passwd
sudo chmod 600 /etc/mosquitto/passwd

echo "[7/7] Starting and enabling Mosquitto service..."
sudo systemctl enable mosquitto
sudo systemctl start mosquitto

# Wait a moment for service to start
sleep 2

# Check if service is running
if sudo systemctl is-active --quiet mosquitto; then
    echo "✅ Mosquitto service is running"
else
    echo "❌ Mosquitto service failed to start"
    echo "Checking service status..."
    sudo systemctl status mosquitto
    exit 1
fi

# Get the local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo
echo "========================================"
echo "MQTT Broker Setup Complete!"
echo "========================================"
echo
echo "Mosquitto MQTT Broker is now running on:"
echo "  Host: localhost / $LOCAL_IP"
echo "  Port: 1883"
echo
echo "Created users:"
echo "  - esp32_user (for ESP32 devices)"
echo "  - edge_processor (for edge processor)"
echo
echo "Configuration file: /etc/mosquitto/conf.d/smart-bins.conf"
echo "Password file: /etc/mosquitto/passwd"
echo "Log file: /var/log/mosquitto/mosquitto.log"
echo
echo "Next steps:"
echo "1. Update your .env file with local MQTT credentials"
echo "2. Test the connection using the provided test scripts"
echo "3. Configure your ESP32 with the esp32_user credentials"
echo
echo "Service management:"
echo "  Start:   sudo systemctl start mosquitto"
echo "  Stop:    sudo systemctl stop mosquitto"
echo "  Status:  sudo systemctl status mosquitto"
echo "  Logs:    sudo journalctl -u mosquitto -f"
echo
echo "Testing the installation:"
echo "  Subscribe: mosquitto_sub -h localhost -t test/topic -u esp32_user -P [password]"
echo "  Publish:   mosquitto_pub -h localhost -t test/topic -m 'Hello World' -u esp32_user -P [password]"
echo

# Test basic connectivity
echo "Testing basic MQTT connectivity..."
if command -v mosquitto_pub &> /dev/null && command -v mosquitto_sub &> /dev/null; then
    echo "MQTT client tools are available for testing"
    echo "You can test the broker using the commands shown above"
else
    echo "MQTT client tools not found. Install with: sudo apt-get install mosquitto-clients"
fi

echo
echo "Setup completed successfully!"
