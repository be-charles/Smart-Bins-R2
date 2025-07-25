# MQTT Setup Guide - Smart Bins System

This guide will help you set up the complete MQTT infrastructure to fix the ESP32 connection issue (error code `rc=2`).

## Problem Overview

Your ESP32 is getting MQTT error `rc=2` because it's trying to connect to a local MQTT broker that doesn't exist. The current setup has:

- **ESP32**: Configured to connect to `192.168.19.179:1883` (your laptop)
- **Edge Processor**: Only connects to cloud MQTT, no local broker
- **Missing Component**: Local MQTT broker for ESP32 connections

## Solution Architecture

```
ESP32 → Local MQTT Broker → Edge Processor → Cloud MQTT
```

The solution implements:
1. **Local MQTT Broker** (Mosquitto) on your laptop
2. **Dual MQTT Client** in edge processor (local + cloud)
3. **Message Bridging** between local and cloud systems

## Step-by-Step Setup

### Phase 1: Install Local MQTT Broker

#### For Windows (Current Development)

1. **Run the setup script as Administrator:**
   ```cmd
   # Right-click and "Run as administrator"
   setup-windows.bat
   ```

2. **The script will:**
   - Guide you through Mosquitto installation
   - Create configuration files
   - Set up user accounts (`esp32_user` and `edge_processor`)
   - Start the MQTT service

3. **Manual Installation (if script fails):**
   - Download Mosquitto from: https://mosquitto.org/download/
   - Install to `C:\Program Files\mosquitto\`
   - Run the setup script to configure

#### For Linux/Raspberry Pi (Future Deployment)

1. **Run the setup script:**
   ```bash
   chmod +x setup-linux.sh
   ./setup-linux.sh
   ```

2. **The script will:**
   - Install Mosquitto via package manager
   - Configure the broker
   - Create user accounts
   - Start and enable the service

### Phase 2: Update Configuration

#### Update .env File

Your `.env` file has been updated with local MQTT settings:

```env
# Local MQTT Broker Settings (for ESP32 connections)
LOCAL_MQTT_HOST=localhost
LOCAL_MQTT_PORT=1883
LOCAL_MQTT_USERNAME=edge_processor
LOCAL_MQTT_PASSWORD=change_this_password
```

**Important:** Change `LOCAL_MQTT_PASSWORD` to match the password you set during Mosquitto setup.

#### Update ESP32 Configuration

Update your ESP32 `secrets.h` file:

```cpp
// MQTT Configuration - Replace with your actual MQTT server details
#define MQTT_SERVER "192.168.19.179"  // Your laptop IP (keep this)
#define MQTT_CLIENT_ID "smart_scale_001"

// Add these if using authentication
#define MQTT_USERNAME "esp32_user"
#define MQTT_PASSWORD "your_esp32_password"
```

### Phase 3: Test the Setup

#### Test Local MQTT Broker

1. **Quick connection test:**
   ```bash
   cd edge-processor
   node local-mqtt-test.js --quick
   ```

2. **Full test suite:**
   ```bash
   node local-mqtt-test.js
   ```

3. **Simulate ESP32 data:**
   ```bash
   node local-mqtt-test.js --simulate
   ```

#### Test Cloud MQTT Connection

```bash
node mqtt-test.js
```

#### Test Edge Processor

1. **Start the edge processor:**
   ```bash
   cd edge-processor
   node server.js
   ```

2. **Check the logs for:**
   - ✅ Connected to local MQTT broker
   - ✅ Connected to cloud MQTT
   - 📡 Subscribed to ESP32 scale topics

3. **Check status endpoint:**
   ```
   http://localhost:3002/api/status
   ```

### Phase 4: ESP32 Integration

#### Update ESP32 Code (if needed)

If your ESP32 needs authentication, update the `smart_scale.ino`:

```cpp
void reconnect_mqtt() {
  // ... existing code ...
  
  // Use authentication if defined
  #ifdef MQTT_USERNAME
    if (client.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
  #else
    if (client.connect(MQTT_CLIENT_ID)) {
  #endif
    
    // ... rest of connection code ...
  }
}
```

#### Upload and Test

1. **Upload firmware to ESP32**
2. **Monitor serial output for:**
   - WiFi connection success
   - MQTT connection success (no more `rc=2` errors)
   - Data publishing confirmation

## Troubleshooting

### Common Issues

#### 1. ESP32 Still Gets `rc=2` Error

**Possible Causes:**
- Mosquitto not running
- Wrong credentials
- Firewall blocking connection

**Solutions:**
```cmd
# Check if Mosquitto is running
sc query mosquitto

# Start Mosquitto if stopped
sc start mosquitto

# Test local connection
node local-mqtt-test.js --quick
```

#### 2. Edge Processor Can't Connect to Local Broker

**Check:**
- `.env` file has correct `LOCAL_MQTT_PASSWORD`
- Mosquitto user accounts are created
- Broker is listening on port 1883

**Test:**
```bash
# Test with mosquitto clients
mosquitto_pub -h localhost -t test/topic -m "hello" -u edge_processor -P your_password
```

#### 3. Data Not Reaching Cloud

**Check:**
- Cloud MQTT credentials in `.env`
- Network connectivity to cloud server
- Edge processor logs for forwarding errors

#### 4. Windows Firewall Issues

**Allow Mosquitto through firewall:**
```cmd
netsh advfirewall firewall add rule name="Mosquitto MQTT" dir=in action=allow protocol=TCP localport=1883
```

### Diagnostic Commands

#### Windows
```cmd
# Check Mosquitto service
sc query mosquitto

# View Mosquitto logs
type "C:\Program Files\mosquitto\logs\mosquitto.log"

# Test local connection
mosquitto_pub -h localhost -t test/topic -m "test" -u esp32_user -P your_password
mosquitto_sub -h localhost -t test/topic -u esp32_user -P your_password
```

#### Linux
```bash
# Check Mosquitto service
sudo systemctl status mosquitto

# View logs
sudo journalctl -u mosquitto -f

# Test connection
mosquitto_pub -h localhost -t test/topic -m "test" -u esp32_user -P your_password
mosquitto_sub -h localhost -t test/topic -u esp32_user -P your_password
```

## File Structure

After setup, your project will have:

```
Smart-Bins-R2/
├── setup-windows.bat          # Windows Mosquitto installer
├── setup-linux.sh             # Linux Mosquitto installer
├── MQTT_SETUP_GUIDE.md        # This guide
├── edge-processor/
│   ├── .env                    # Updated with local MQTT config
│   ├── server.js               # Updated with dual MQTT support
│   ├── local-mqtt-test.js      # Local broker testing
│   ├── mqtt-test.js            # Cloud broker testing
│   └── ...
└── esp32-firmware/
    ├── secrets.h               # ESP32 MQTT configuration
    ├── smart_scale.ino         # ESP32 firmware
    └── ...
```

## Security Considerations

1. **Change Default Passwords:** Update all MQTT passwords from defaults
2. **Firewall Rules:** Only allow necessary ports (1883 for MQTT)
3. **User Permissions:** Use separate accounts for ESP32 and edge processor
4. **Network Security:** Consider VPN for production deployments

## Production Deployment

### Moving to Raspberry Pi

1. **Copy files to Raspberry Pi**
2. **Run Linux setup script:**
   ```bash
   ./setup-linux.sh
   ```
3. **Update IP addresses in ESP32 configuration**
4. **Test end-to-end connectivity**

### Scaling Considerations

- **Multiple ESP32 devices:** Use unique client IDs
- **Load balancing:** Consider MQTT broker clustering
- **Monitoring:** Set up broker and connection monitoring
- **Backup:** Regular configuration and data backups

## Success Indicators

When everything is working correctly, you should see:

1. **ESP32 Serial Monitor:**
   ```
   WiFi connected
   Attempting MQTT connection...connected
   Data published: {"scale_id":"SCALE_001",...}
   ```

2. **Edge Processor Logs:**
   ```
   ✅ Connected to local MQTT broker
   ✅ Connected to cloud MQTT
   📨 Received from ESP32: inventory/scale/001 {...}
   ☁️  Forwarded scale data to cloud: SCALE_001
   ```

3. **Web Dashboard:**
   - Shows real-time ESP32 data
   - Status page shows both connections as healthy

## Support

If you encounter issues:

1. **Check the logs** in both edge processor and Mosquitto
2. **Run the test scripts** to isolate the problem
3. **Verify network connectivity** between components
4. **Review firewall settings** on all systems

The setup creates a robust, scalable MQTT infrastructure that will eliminate the ESP32 connection errors and provide reliable data flow from your smart scales to the cloud.
