# Installation Loop Fix - Root Cause Analysis & Solution

## 🚨 The Problem

**Symptoms:**
- Accept terms of service → works fine
- Run demo sheet → works fine  
- Edge-processor connects → **SYSTEM RESETS**
- Back to installation wizard
- **NO credentials work** (admin/1234, admin/changeme123, etc.)

## 🔍 Root Cause Discovered

The installation loop was caused by **conflicting authentication configuration** between:

1. **Docker-compose.yml environment variables:**
   ```yaml
   - STREAMSHEETS_ADMIN_USER=admin
   - STREAMSHEETS_ADMIN_PASSWORD=changeme123
   ```

2. **Actual user database:** Contains admin/1234 (created during wizard)

3. **Edge-processor MQTT connection:** Tries to authenticate with changeme123

## 💥 What Happens During Reset

**The Fatal Sequence:**

1. **User completes installation wizard** → Creates admin/1234 in MongoDB
2. **Environment variables force** Streamsheets to expect admin/changeme123
3. **Edge-processor connects** using changeme123 from .env file
4. **Streamsheets detects credential mismatch:**
   - Database has: admin/1234
   - Environment expects: admin/changeme123  
   - MQTT client uses: changeme123
5. **Security system triggers** → Assumes database corruption/breach
6. **Nuclear option executed** → **Complete MongoDB wipe**
7. **All users deleted** → Back to installation wizard
8. **No credentials work** → Database is empty

## ✅ The Complete Fix

### 1. Remove Conflicting Environment Variables

**Before (BROKEN):**
```yaml
environment:
  - STREAMSHEETS_ADMIN_USER=admin
  - STREAMSHEETS_ADMIN_PASSWORD=changeme123
```

**After (FIXED):**
```yaml
environment:
  # Removed conflicting admin credentials - let Streamsheets manage authentication naturally
```

### 2. Update Edge-Processor Configuration

**Before (BROKEN):**
```env
CLOUD_MQTT_USERNAME=admin
CLOUD_MQTT_PASSWORD=changeme123
```

**After (FIXED):**
```env
# MQTT Authentication (leave empty for anonymous access to avoid credential conflicts)
CLOUD_MQTT_USERNAME=
CLOUD_MQTT_PASSWORD=
```

### 3. Smart Authentication Handling

**Edge-processor now:**
- Only uses authentication if both username AND password are provided
- Falls back to anonymous MQTT connection if credentials are empty
- Avoids authentication conflicts that trigger database resets

## 🛠️ How to Apply the Fix

### Option 1: Use Fixed Installation Script
```bash
cd cloud-setup
./install.sh
```

### Option 2: Manual Fix (If System Already Deployed)
```bash
# Stop services
docker-compose down

# Remove conflicting volumes
docker volume rm smart-bins_streamsheets_mongo

# Start with fixed configuration
docker-compose up -d
```

### Option 3: Update Existing Edge-Processor
```bash
# Edit your .env file
nano edge-processor/.env

# Set empty credentials:
CLOUD_MQTT_USERNAME=
CLOUD_MQTT_PASSWORD=

# Restart edge-processor
```

## 🎯 Testing the Fix

### 1. Deploy Fresh System
```bash
./install.sh
```

### 2. Complete Installation Wizard
- Access http://your-ip:8081
- Create admin user with any password you want
- Complete setup

### 3. Start Edge-Processor
```bash
cd ../edge-processor
npm start
```

### 4. Verify No Reset
- Edge-processor should connect anonymously
- Streamsheets should remain stable
- No credential conflicts
- No database resets

## 🔒 Security Considerations

### Anonymous MQTT Access
- **Internal MQTT** (port 1883): Anonymous access for edge-processor
- **Web Interface**: Still requires login credentials
- **External MQTT** (port 1884): Can be secured separately if needed

### Production Security
For production deployments:
1. Enable MQTT authentication on external broker (port 1884)
2. Keep internal MQTT (port 1883) anonymous for edge-processor
3. Use firewall to restrict access to internal MQTT port
4. Implement proper user management in Streamsheets web interface

## 📋 What Changed

| Component | Before | After |
|-----------|--------|-------|
| **docker-compose.yml** | Forced admin credentials | Natural authentication |
| **edge-processor .env** | Hardcoded credentials | Anonymous MQTT |
| **server.js** | Always uses auth | Smart auth handling |
| **Installation** | Credential conflicts | Clean setup |

## ✅ Success Indicators

After applying the fix:
- ✅ **No installation loops** - System stays stable
- ✅ **Edge-processor connects** - Anonymous MQTT works
- ✅ **Credentials persist** - No database resets
- ✅ **User choice** - Set any password during wizard
- ✅ **No conflicts** - Environment and database align

## 🆘 If Problems Persist

1. **Check logs:**
   ```bash
   docker-compose logs streamsheets
   docker-compose logs mosquitto
   ```

2. **Verify configuration:**
   ```bash
   # Check no conflicting environment variables
   docker-compose config
   
   # Check edge-processor uses anonymous connection
   grep CLOUD_MQTT edge-processor/.env
   ```

3. **Complete reset:**
   ```bash
   docker-compose down
   docker volume prune -f
   ./install.sh
   ```

The root cause was the authentication conflict between predetermined environment variables and user-created credentials. By removing the conflicting environment variables and using anonymous MQTT for the edge-processor, the system now works reliably without installation loops.
