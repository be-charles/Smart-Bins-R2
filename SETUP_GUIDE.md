# Smart Bins R2 - Complete Setup Guide

This guide will walk you through setting up the complete IoT inventory management system from hardware to cloud.

## 🏗️ System Overview

```
ESP32 + Load Cells → [WiFi] → Edge Node (Laptop/RPi) → [Internet] → DigitalOcean Streamsheets
```

## 📋 Prerequisites

### Hardware Required
- ESP32 development boards (1 per scale)
- HX711 load cell amplifiers (1 per scale)
- 50kg load cells (4 per scale for full bridge)
- Laptop or Raspberry Pi (edge processing)
- DigitalOcean droplet (cloud services)

### Software Required
- Arduino IDE (for ESP32 programming)
- Node.js 16+ (for edge processor)
- Docker & Docker Compose (for cloud deployment)

## 🚀 Quick Start (30 minutes)

### Step 1: Deploy Cloud Services (5 minutes)

1. **Create DigitalOcean Droplet**
   ```bash
   # Minimum specs: Ubuntu 22.04, 2GB RAM, 1 CPU
   ```

2. **Deploy Streamsheets**
   ```bash
   # On your droplet
   git clone <your-repo-url>
   cd smart-bins-r2/cloud-setup
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Note your droplet IP address** - you'll need this for the next steps

### Step 2: Setup Edge Processor (10 minutes)

1. **Install Node.js** (if not already installed)
   ```bash
   # On Windows/Mac/Linux
   # Download from https://nodejs.org/
   ```

2. **Setup Edge Processor**
   ```bash
   cd edge-processor
   cp .env.example .env
   
   # Edit .env file with your cloud IP
   # CLOUD_MQTT_HOST=your-digitalocean-ip
   
   npm install
   npm start
   ```

3. **Verify Edge Processor**
   - Open http://localhost:3000
   - Should see "Smart Bins R2 - Edge Dashboard"

### Step 3: Program ESP32 (10 minutes)

1. **Install Arduino IDE Libraries**
   - WiFi (built-in)
   - PubSubClient
   - ArduinoJson
   - HX711

2. **Configure ESP32 Firmware**
   ```cpp
   // In esp32-firmware/smart_scale.ino
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* mqtt_server = "YOUR_LAPTOP_IP";  // Edge node IP
   ```

3. **Upload Firmware**
   - Connect ESP32 via USB
   - Select board: "ESP32 Dev Module"
   - Upload the sketch

### Step 4: Connect Hardware (5 minutes)

1. **ESP32 to HX711 Connections**
   ```
   ESP32 Pin 4  → HX711 DOUT
   ESP32 Pin 5  → HX711 SCK
   ESP32 3.3V   → HX711 VCC
   ESP32 GND    → HX711 GND
   ```

2. **HX711 to Load Cells**
   ```
   HX711 E+  → Load Cell Red (Excitation+)
   HX711 E-  → Load Cell Black (Excitation-)
   HX711 A+  → Load Cell White (Signal+)
   HX711 A-  → Load Cell Green (Signal-)
   ```

### Step 5: Test System

1. **Check ESP32 Serial Monitor**
   - Should show WiFi connection
   - Should show MQTT connection
   - Should show weight readings

2. **Check Edge Dashboard**
   - Open http://localhost:3000
   - Should see your scale appear
   - Should show real-time weight data

3. **Check Streamsheets**
   - Open http://your-digitalocean-ip:8080
   - Login: admin/admin
   - Should receive MQTT data from edge node

## 🔧 Detailed Configuration

### ESP32 Configuration

#### WiFi Settings
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

#### MQTT Settings
```cpp
const char* mqtt_server = "192.168.1.100";  // Your laptop/RPi IP
const int mqtt_port = 1883;
const char* mqtt_client_id = "smart_scale_001";
const char* mqtt_topic = "inventory/scale/001";
```

#### Scale Settings
```cpp
const char* scale_id = "SCALE_001";           // Unique identifier
const char* location = "WAREHOUSE_A";         // Physical location
const char* item_type = "COMPONENTS";         // Type of items
const float item_weight = 0.5;               // Weight per item (kg)
float calibration_factor = -7050.0;          // Calibration factor
```

### Edge Processor Configuration

Create `.env` file:
```bash
# MQTT Settings
MQTT_LOCAL_PORT=1883
CLOUD_MQTT_HOST=your-digitalocean-ip
CLOUD_MQTT_PORT=1883

# Web Interface
WEB_PORT=3000

# Database
DB_PATH=./data/inventory.db

# Edge Node Info
EDGE_NODE_ID=edge_001
LOCATION=WAREHOUSE_A
```

### Streamsheets Configuration

1. **Access Streamsheets**: http://your-digitalocean-ip:8080
2. **Login**: admin/admin (change immediately!)
3. **Add MQTT Consumer**:
   - Host: localhost
   - Port: 1883
   - Topics: inventory/+/+

## 📊 Creating Dashboards

### Streamsheets Dashboard

1. **Create New Streamsheet**
2. **Add MQTT Consumer as Data Source**
3. **Configure Cells**:

```javascript
// Cell A1: Scale ID
=JSON.VALUE(MQTT.CONSUMER, "scale_id")

// Cell B1: Current Weight
=JSON.VALUE(MQTT.CONSUMER, "weight_kg")

// Cell C1: Item Count
=JSON.VALUE(MQTT.CONSUMER, "item_count")

// Cell D1: Location
=JSON.VALUE(MQTT.CONSUMER, "location")

// Cell E1: Timestamp
=TEXT(JSON.VALUE(MQTT.CONSUMER, "timestamp")/1000/86400+25569, "yyyy-mm-dd hh:mm:ss")

// Cell F1: Status
=IF(JSON.VALUE(MQTT.CONSUMER, "item_count")<10, "LOW STOCK", "OK")
```

### Edge Dashboard

The edge dashboard is automatically available at http://localhost:3000 and shows:
- Active scales count
- Total items across all scales
- Cloud connection status
- Real-time scale data with status indicators

## 🔍 Troubleshooting

### ESP32 Issues

**WiFi Connection Failed**
```cpp
// Check serial monitor output
// Verify SSID and password
// Ensure ESP32 is in range
```

**MQTT Connection Failed**
```cpp
// Verify edge node IP address
// Check if MQTT broker is running
// Check firewall settings
```

**Scale Reading Issues**
```cpp
// Verify load cell connections
// Check calibration factor
// Ensure stable power supply
```

### Edge Processor Issues

**Can't Start Server**
```bash
# Check Node.js version
node --version  # Should be 16+

# Check port availability
netstat -an | grep 3000

# Check logs
npm start
```

**No Data from ESP32**
```bash
# Check MQTT broker status
# Verify ESP32 IP can reach edge node
# Check firewall on laptop/RPi
```

### Cloud Issues

**Can't Access Streamsheets**
```bash
# Check DigitalOcean firewall
# Verify services are running: docker-compose ps
# Check logs: docker-compose logs streamsheets
```

**MQTT Data Not Reaching Cloud**
```bash
# Check edge processor cloud connection
# Verify CLOUD_MQTT_HOST in .env
# Check DigitalOcean firewall port 1883
```

## 🔒 Security Considerations

### Production Deployment

1. **Change Default Passwords**
   - Streamsheets: admin/admin → strong password
   - MQTT: Enable authentication

2. **Enable Firewall**
   ```bash
   # On DigitalOcean droplet
   ufw allow ssh
   ufw allow 8080  # Streamsheets
   ufw allow 1883  # MQTT
   ufw --force enable
   ```

3
