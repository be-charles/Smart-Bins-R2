# Smart Bins R2 - Complete Installation Guide

## 🚀 Quick Start (Recommended)

For most users, use the **ultimate installation script**:

```bash
cd cloud-setup
chmod +x install.sh
./install.sh
```

This single script handles everything: Docker installation, system setup, deployment, and all fixes.

## 📋 Available Scripts Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| **`install.sh`** | **Ultimate installer** | ✅ **New installations** or complete system reset |
| `clean-reinstall.sh` | Clean reinstall only | When Docker is already installed |
| `deploy.sh` | Legacy deployment | ⚠️ **Not recommended** (missing fixes) |
| `fix-mosquitto.sh` | Mosquitto fix only | When only Mosquitto has issues |
| `fix-streamsheets.sh` | Legacy fix | ⚠️ **Deprecated** (use install.sh instead) |

## 🎯 Recommended Installation Path

### For New DigitalOcean Droplets

1. **Create Ubuntu 22.04 droplet** (2GB+ RAM recommended)
2. **Connect via SSH**: `ssh root@your-droplet-ip`
3. **Clone repository**:
   ```bash
   git clone https://github.com/your-repo/smart-bins-r2.git
   cd smart-bins-r2/cloud-setup
   ```
4. **Run ultimate installer**:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

### Expected Results

After successful installation:

✅ **Working Services**:
- **Streamsheets**: `http://your-ip:8081`
- **Admin Panel**: `http://your-ip:9000`
- **MQTT Broker**: `your-ip:1883` (internal), `your-ip:1884` (external)

✅ **Login Credentials**:
- **Username**: `admin`
- **Password**: `1234`

✅ **No Common Issues**:
- No installation loops
- No 502 Bad Gateway errors
- No container restart problems
- Persistent data across restarts

## 🔧 What Each Script Does

### `install.sh` (Ultimate Installer)

**Phases**:
1. **System Check**: Verifies root access and system state
2. **Installation**: Installs Docker and Docker Compose if needed
3. **Cleanup**: Removes any existing containers/volumes
4. **Configuration**: Sets up directories and permissions
5. **Deployment**: Pulls images and starts services
6. **Verification**: Checks logs and service status

**Includes All Fixes**:
- ✅ MongoDB persistence (no installation loops)
- ✅ Mosquitto PID file fix (no restart loops)
- ✅ Correct port configuration (8081, not 8080)
- ✅ Proper credentials (admin/1234)
- ✅ Directory permissions for Mosquitto

### `clean-reinstall.sh` (Docker-Only Reinstall)

**Use Case**: When Docker is already installed but you need to reset everything.

**What it does**:
- Assumes Docker/Docker Compose are installed
- Performs complete cleanup and fresh deployment
- Applies all configuration fixes

### `deploy.sh` (Legacy - Not Recommended)

**Issues**:
- ❌ Missing MongoDB persistence fix
- ❌ Missing Mosquitto PID fix
- ❌ Wrong port configuration (8080 instead of 8081)
- ❌ Wrong credentials shown

**Only use if**: You specifically need the old behavior for testing.

## 🚨 Common Problems and Solutions

### Problem: Installation Loops

**Symptoms**: After accepting terms and running demo, redirected back to installation wizard.

**Cause**: MongoDB data not persisting across container restarts.

**Solution**: Use `install.sh` - it includes persistent MongoDB volume mapping.

### Problem: 502 Bad Gateway

**Symptoms**: "502 Bad Gateway nginx/1.14.2" error when accessing Streamsheets.

**Cause**: Configuration conflicts or service startup issues.

**Solution**: Use `install.sh` for clean deployment with correct configuration.

### Problem: Mosquitto Constantly Restarting

**Symptoms**: `docker ps` shows Mosquitto with "Restarting" status.

**Cause**: PID file permission issues in Docker container.

**Solution**: 
- **Full fix**: Use `install.sh`
- **Quick fix**: Use `fix-mosquitto.sh`

### Problem: Wrong Port or Credentials

**Symptoms**: Can't access on port 8080, or admin/changeme123 doesn't work.

**Reality**: 
- **Correct port**: 8081
- **Correct credentials**: admin/1234

**Solution**: Use updated scripts that show correct information.

## 🔍 Verification Steps

After installation, verify everything works:

### 1. Check Container Status
```bash
docker-compose ps
```
**Expected**: All containers show "Up" status (no "Restarting").

### 2. Test Web Access
- Go to `http://your-droplet-ip:8081`
- Should load Streamsheets login page (not installation wizard)
- Login with admin/1234
- Should access dashboard without being redirected back to installation

### 3. Test Data Persistence
```bash
# Restart containers
docker-compose restart

# Wait 30 seconds
sleep 30

# Try logging in again - should work without installation wizard
```

### 4. Check Logs for Errors
```bash
# Check for any error messages
docker-compose logs streamsheets | grep -i error
docker-compose logs mosquitto | grep -i error
```

## 🛠️ Troubleshooting

### If Installation Fails

1. **Check system resources**:
   ```bash
   free -h    # Check memory
   df -h      # Check disk space
   ```

2. **Check Docker status**:
   ```bash
   sudo systemctl status docker
   ```

3. **Manual cleanup and retry**:
   ```bash
   docker system prune -af
   docker volume prune -f
   ./install.sh
   ```

### If Services Don't Start

1. **Check port conflicts**:
   ```bash
   netstat -tulpn | grep :8081
   netstat -tulpn | grep :1883
   ```

2. **Check firewall**:
   ```bash
   ufw status
   # If needed:
   ufw allow 8081
   ufw allow 1883
   ```

3. **Restart Docker service**:
   ```bash
   sudo systemctl restart docker
   ./install.sh
   ```

## 🔒 Post-Installation Security

### Immediate Steps

1. **Change default password**:
   - Login to Streamsheets
   - Go to Administration → Users
   - Select admin user
   - Change password from `1234`

2. **Configure firewall**:
   ```bash
   ufw allow ssh
   ufw allow 8081
   ufw allow 1883
   ufw --force enable
   ```

3. **Update system**:
   ```bash
   apt update && apt upgrade -y
   ```

## 📊 Performance Optimization

### For 2GB Droplets
- Default configuration should work well
- Monitor with `docker stats`

### For 1GB Droplets (Not Recommended)
```bash
# Add swap space
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### For 4GB+ Droplets
- Consider increasing container memory limits in docker-compose.yml
- Can handle more concurrent users and larger datasets

## 🎯 Next Steps After Installation

1. **Access Streamsheets**: `http://your-ip:8081`
2. **Change default password**
3. **Create your first inventory dashboard**
4. **Configure ESP32 devices** to connect to `your-ip:1883`
5. **Set up MQTT topics** for your inventory data
6. **Create Streamsheets** to visualize and process the data

## 📞 Support

If you encounter issues:

1. **Check logs first**:
   ```bash
   docker-compose logs -f
   ```

2. **Verify system requirements**:
   - Ubuntu 22.04 LTS
   - 2GB+ RAM
   - 20GB+ disk space
   - Docker and Docker Compose installed

3. **Common solutions**:
   - Restart Docker service
   - Check firewall settings
   - Verify port availability
   - Ensure sufficient system resources

The `install.sh` script is designed to handle most common issues automatically, providing a reliable Smart Bins R2 deployment with Eclipse Streamsheets.
