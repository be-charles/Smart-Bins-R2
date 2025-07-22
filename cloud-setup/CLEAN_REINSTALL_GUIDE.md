# Clean Reinstall Guide

## When to Use Clean Reinstall

Use the clean reinstall when you experience:
- ✅ Installation loop issues (terms of service → login → terms of service)
- ✅ 502 Bad Gateway errors
- ✅ Containers constantly restarting (especially Mosquitto)
- ✅ Login credentials not working
- ✅ Persistent configuration issues

## Quick Start

```bash
# On your DigitalOcean droplet
cd smart-bins-r2/cloud-setup
chmod +x clean-reinstall.sh
./clean-reinstall.sh
```

## What the Script Does

### Phase 1: Complete Cleanup
- Stops all running containers
- Removes all containers and volumes
- Cleans up orphaned Docker resources
- **⚠️ WARNING: This deletes ALL existing data**

### Phase 2: Fix Configuration
- Creates Mosquitto directories with correct permissions
- Sets proper file permissions on scripts
- Fixes ownership issues that cause container restarts

### Phase 3: Fresh Installation
- Pulls latest Docker images
- Starts services with corrected configuration
- Waits for proper initialization
- Verifies all services are running

## Expected Results

After successful reinstall:

### ✅ Working Services
- **Streamsheets**: Available at `http://your-ip:8081`
- **Mosquitto**: Running without restart loops
- **All containers**: Status should be "Up"

### ✅ Fixed Login
- **Username**: `admin`
- **Password**: `1234`
- **No more installation loops**

### ✅ Persistent Data
- MongoDB data survives container restarts
- User accounts and settings persist
- Demo sheets work without breaking the system

## Verification Steps

1. **Check container status**:
   ```bash
   docker-compose ps
   ```
   All should show "Up" status

2. **Check logs for errors**:
   ```bash
   docker-compose logs streamsheets
   docker-compose logs mosquitto
   ```

3. **Test web access**:
   - Go to `http://your-droplet-ip:8081`
   - Should load without 502 errors
   - Login with admin/1234

4. **Test persistence**:
   ```bash
   docker-compose restart
   # Wait 30 seconds, then try logging in again
   ```

## Troubleshooting

### Script Permission Denied
```bash
chmod +x clean-reinstall.sh
```

### Services Won't Start
```bash
# Check system resources
free -h
df -h

# Check Docker status
sudo systemctl status docker
```

### Still Getting 502 Errors
```bash
# Check if ports are in use
netstat -tulpn | grep :8081

# Restart Docker service
sudo systemctl restart docker
```

## Post-Installation Security

**IMMEDIATELY after successful login:**

1. **Change default password**:
   - Go to Administration → Users
   - Select admin user
   - Change password from `1234`

2. **Configure firewall** (if not done):
   ```bash
   ufw allow ssh
   ufw allow 8081
   ufw allow 1883
   ufw --force enable
   ```

## Key Differences from Previous Fixes

| Issue | Previous Approach | Clean Reinstall |
|-------|------------------|-----------------|
| Installation Loop | Partial fix with existing data | Complete fresh start |
| 502 Errors | Configuration patches | Clean configuration |
| Mosquitto Restarts | Manual permission fixes | Automated permission setup |
| Volume Issues | Volume pruning only | Complete volume recreation |

## Success Indicators

✅ **No installation wizard** - Direct login page
✅ **admin/1234 works** - No credential issues  
✅ **All containers "Up"** - No restart loops
✅ **Demo sheets work** - No system resets
✅ **Data persists** - Survives container restarts

The clean reinstall approach eliminates all potential configuration conflicts and gives you a guaranteed working system.
