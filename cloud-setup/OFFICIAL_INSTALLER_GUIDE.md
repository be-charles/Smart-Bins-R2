# Smart Bins R2 - Official Cedalo Installer Solution

## 🚨 Why Our Custom Installation Was Failing

After extensive troubleshooting, we discovered the root cause of the installation loop issue: **We were fighting against Streamsheets' designed architecture**.

### The Problems with Our Custom Approach

1. **Authentication Conflicts**: Our docker-compose.yml forced specific credentials while users created different ones
2. **Volume Persistence Issues**: Manual volume mapping conflicted with Streamsheets' internal data management
3. **Service Coordination**: Multiple containers (Streamsheets + separate Mosquitto) caused conflicts
4. **Configuration Overrides**: Environment variables interfered with Streamsheets' initialization process

## ✅ The Official Solution: cedalo/installer

The official Cedalo installer is specifically designed to handle all the complexity we've been struggling with.

### Why the Official Installer Works

**🎯 Proper Architecture**:
- Uses the correct container orchestration
- Handles authentication properly
- Manages data persistence correctly
- Coordinates all services properly

**🔒 Standard Authentication**:
- Default credentials: `admin/1234`
- No environment variable conflicts
- Proper user management system
- Standard password change process

**💾 Reliable Persistence**:
- Proper volume management
- No data loss on container restart
- Correct MongoDB configuration
- Stable across updates

## 📋 Installation Comparison

| Aspect | Our Custom Setup | Official Installer |
|--------|------------------|-------------------|
| **Complexity** | High (multiple files, configs) | Low (one command) |
| **Reliability** | Unstable (installation loops) | Stable (tested by Cedalo) |
| **Support** | None (custom configuration) | Full (official method) |
| **Updates** | Manual, risky | Built-in update script |
| **Authentication** | Conflicting | Standard |
| **Documentation** | Custom troubleshooting | Official docs |

## 🚀 How to Use the Official Installer

### Quick Start

```bash
cd cloud-setup
chmod +x cedalo-install.sh
./cedalo-install.sh
```

### What the Script Does

1. **Installs Docker** (if needed)
2. **Cleans up** any existing installations
3. **Runs official installer**: `cedalo/installer:2-linux`
4. **Starts services** using official scripts
5. **Provides access information**

### Interactive Installation

The installer will prompt you to select components:

```
? Select what to install › - Space to select. Return to submit
◉   Eclipse Streamsheets      ← Select this
◉   Eclipse Mosquitto 2.0     ← Select this  
◯   Management Center         ← Optional (deselect for simplicity)
```

## 🎯 Perfect for Smart Bins Project

### What You Get

**✅ Complete MQTT Platform**:
- Eclipse Streamsheets (dashboards, data processing)
- Eclipse Mosquitto (MQTT broker)
- Web interface for management
- Built-in data persistence

**✅ Smart Bins Integration**:
- ESP32 scales connect to port 1883
- Edge-processor connects to same broker
- Real-time inventory dashboards
- Historical data storage

**✅ No Complexity**:
- One MQTT broker (not two)
- Standard authentication
- Official documentation applies
- Easy updates and maintenance

## 🔧 Post-Installation

### Access Information

- **Web Interface**: `http://your-server-ip:8081`
- **Default Login**: `admin/1234`
- **MQTT Broker**: `your-server-ip:1883`

### Management Commands

```bash
cd /root/cedalo_platform

# Start services
sh start.sh

# Stop services  
sh stop.sh

# Update platform
sh update.sh

# View logs
tail -f streamsheets.log
```

### Security Setup

1. **Login** to web interface
2. **Change password** in Administration → Users
3. **Configure firewall** for ports 8081 and 1883
4. **Set up MQTT authentication** if needed for production

## 🎯 Smart Bins Configuration

### ESP32 Firmware
```cpp
// MQTT Configuration
const char* mqtt_server = "your-server-ip";
const int mqtt_port = 1883;
// No authentication needed for internal use
```

### Edge-Processor Configuration
```env
# .env file
CLOUD_MQTT_HOST=your-server-ip
CLOUD_MQTT_PORT=1883
# Leave credentials empty for anonymous access
CLOUD_MQTT_USERNAME=
CLOUD_MQTT_PASSWORD=
```

### Streamsheets Dashboards
1. **Create MQTT Consumer** connector
2. **Subscribe to** `inventory/+/+` topics
3. **Build dashboards** showing:
   - Current inventory levels
   - Historical trends
   - Low stock alerts
   - Scale status monitoring

## 🔍 Why This Solves All Our Issues

### ❌ Installation Loops → ✅ Stable Operation
- **Root Cause**: Authentication conflicts between environment variables and user database
- **Solution**: Official installer uses standard authentication without conflicts

### ❌ Credential Lockouts → ✅ Predictable Login
- **Root Cause**: Database resets due to configuration conflicts
- **Solution**: Standard admin/1234 credentials, proper user management

### ❌ Container Restart Issues → ✅ Reliable Persistence
- **Root Cause**: Improper volume mapping and service coordination
- **Solution**: Official installer handles persistence correctly

### ❌ Complex Troubleshooting → ✅ Standard Support
- **Root Cause**: Custom configuration with no documentation
- **Solution**: Official method with full documentation and support

## 📞 Support and Documentation

### Official Resources
- **Documentation**: https://docs.cedalo.com/streamsheets/2.5/installation
- **Docker Hub**: https://hub.docker.com/r/cedalo/installer
- **Community**: Standard Streamsheets community support

### No More Custom Issues
- No authentication conflicts
- No volume persistence problems
- No container coordination issues
- No environment variable conflicts

## 🎉 Conclusion

The official Cedalo installer eliminates all the complexity and reliability issues we've been fighting. It provides:

- ✅ **Stable, tested installation**
- ✅ **Standard authentication (admin/1234)**
- ✅ **Proper data persistence**
- ✅ **Official support and documentation**
- ✅ **Perfect for Smart Bins project**

**Recommendation**: Use `cedalo-install.sh` for all new deployments. It's the reliable, supported way to deploy Streamsheets for the Smart Bins project.
