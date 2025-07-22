# Cloud Setup - Eclipse Streamsheets on DigitalOcean

This directory contains the configuration and deployment scripts for running Eclipse Streamsheets on a DigitalOcean droplet.

## Quick Deployment

### 1. Create DigitalOcean Droplet

Create a new droplet with the following specifications:
- **OS**: Ubuntu 22.04 LTS
- **Size**: Basic plan, 2GB RAM minimum (4GB recommended)
- **Region**: Choose closest to your location
- **Authentication**: SSH keys (recommended) or password

### 2. Connect to Your Droplet

```bash
ssh root@your-droplet-ip
```

### 3. Upload Files

Upload the cloud-setup directory to your droplet:

```bash
# From your local machine
scp -r cloud-setup/ root@your-droplet-ip:/root/
```

Or clone the repository:

```bash
# On the droplet
git clone https://github.com/your-repo/smart-bins-r2.git
cd smart-bins-r2/cloud-setup
```

### 4. Run Official Installation Script (Recommended)

```bash
cd cloud-setup
chmod +x cedalo-install.sh
./cedalo-install.sh
```

**Why use the official installer?**
- ✅ Uses official `cedalo/installer` (stable, tested)
- ✅ No authentication conflicts or installation loops
- ✅ Standard admin/1234 credentials
- ✅ Proper data persistence
- ✅ Official support and documentation

The script will:
- Install Docker (if needed)
- Clean up any existing installations
- Run the official Cedalo installer (interactive)
- Start services using official scripts
- Provide access information

**Alternative (Legacy):**
```bash
chmod +x install.sh
./install.sh
```
*Note: The legacy script has known issues with installation loops. Use the official installer instead.*

## Services Included

### Eclipse Streamsheets
- **Web UI**: Port 8080
- **Admin Panel**: Port 9000
- **REST API**: Port 8083
- **WebSocket**: Port 8088
- **Built-in MQTT**: Port 1883
- **Built-in MongoDB**: Port 27017
- **Built-in Redis**: Port 6379

### Eclipse Mosquitto MQTT Broker
- **MQTT**: Port 1884 (external)
- **WebSocket**: Port 9001

## Configuration

### Firewall Setup

Configure your droplet's firewall to allow the necessary ports:

```bash
# Allow SSH
ufw allow ssh

# Allow Streamsheets web interface
ufw allow 8080
ufw allow 9000

# Allow MQTT
ufw allow 1883
ufw allow 1884
ufw allow 9001

# Enable firewall
ufw --force enable
```

### Environment Variables

Create a `.env` file for custom configuration:

```bash
# Streamsheets Configuration
STREAMSHEETS_LICENSE_ACCEPT=true
STREAMSHEETS_GATEWAY_HTTP_PORT=8081
STREAMSHEETS_GATEWAY_WS_PORT=8088
STREAMSHEETS_ADMIN_PORT=9000

# MQTT Configuration
MQTT_HOST=localhost
MQTT_PORT=1883

# Security (for production)
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

## Accessing Streamsheets

1. **Web Interface**: `http://your-droplet-ip:8081`
2. **Admin Panel**: `http://your-droplet-ip:9000`

### Default Login
- **Username**: `admin`
- **Password**: `1234`

**⚠️ Change default credentials immediately in production!**

## Creating Inventory Dashboards

### 1. Connect to MQTT Data Source

In Streamsheets:
1. Go to Administration → Connectors
2. Add new MQTT Consumer
3. Configure:
   - **Host**: `localhost`
   - **Port**: `1883`
   - **Topics**: `inventory/+/+`

### 2. Create Inventory Sheet

1. Create new Streamsheet
2. Add MQTT Consumer as data source
3. Configure cells to display:
   - Scale ID
   - Location
   - Current weight
   - Item count
   - Last update timestamp

### 3. Sample Streamsheet Functions

```javascript
// Get scale weight
=JSON.VALUE(MQTT.CONSUMER, "weight_kg")

// Get item count
=JSON.VALUE(MQTT.CONSUMER, "item_count")

// Format timestamp
=TEXT(JSON.VALUE(MQTT.CONSUMER, "timestamp")/1000/86400+25569, "yyyy-mm-dd hh:mm:ss")

// Calculate inventory status
=IF(JSON.VALUE(MQTT.CONSUMER, "item_count")<10, "LOW", "OK")
```

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f streamsheets
docker-compose logs -f mosquitto
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart streamsheets
```

### Update Services

```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose down
docker-compose up -d
```

### Backup Data

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup Streamsheets data
docker run --rm -v smart-bins_streamsheets_data:/data -v $(pwd)/backups/$(date +%Y%m%d):/backup alpine tar czf /backup/streamsheets_data.tar.gz -C /data .

# Backup MQTT data
docker run --rm -v smart-bins_mosquitto_data:/data -v $(pwd)/backups/$(date +%Y%m%d):/backup alpine tar czf /backup/mosquitto_data.tar.gz -C /data .
```

## Troubleshooting

### 🔄 Installation Loop Issue (COMMON PROBLEM)

**Problem**: After accepting terms of service and running a demo sheet, you're sent back to the installation wizard, and the default credentials (admin/1234) no longer work.

**Cause**: Anonymous MongoDB volumes that get deleted on container restart, causing data loss.

**Solution**: Use the recovery script:

```bash
# Run the fix script
chmod +x fix-streamsheets.sh
./fix-streamsheets.sh
```

**New credentials after fix**:
- Username: `admin`
- Password: `changeme123`

### 🚫 502 Bad Gateway Error (AFTER RUNNING FIX)

**Problem**: After running the Streamsheets fix, you get "502 Bad Gateway nginx/1.14.2" error.

**Cause**: Initial fix attempted to separate MongoDB service, but Streamsheets all-in-one image doesn't support external MongoDB.

**Solution**: Run the updated fix script (it now uses the correct approach):

```bash
# Run the corrected fix script
./fix-streamsheets.sh
```

**What the corrected fix does**:
- Uses all-in-one Streamsheets image (as designed)
- Maps internal MongoDB to persistent volume
- Sets fixed admin credentials
- Avoids service separation issues

**Manual fix** (if script doesn't work):
```bash
# Stop containers and clean volumes
docker-compose down
docker-compose rm -svf mongodb streamsheets
docker volume prune -f

# Restart with fixed configuration
docker-compose up -d
```

### Services Won't Start

```bash
# Check Docker status
sudo systemctl status docker

# Check available disk space
df -h

# Check memory usage
free -h

# Restart Docker
sudo systemctl restart docker
```

### Can't Access Web Interface

1. Check firewall settings
2. Verify services are running: `docker-compose ps`
3. Check logs: `docker-compose logs streamsheets`
4. Ensure ports are not blocked by cloud provider firewall

### MQTT Connection Issues

1. Test MQTT connection:
```bash
# Install MQTT client
sudo apt-get install mosquitto-clients

# Test publish
mosquitto_pub -h localhost -p 1883 -t test/topic -m "Hello World"

# Test subscribe
mosquitto_sub -h localhost -p 1883 -t test/topic
```

2. Check MQTT logs:
```bash
docker-compose logs mosquitto
```

### Memory Issues (1GB Droplets)

If using a 1GB droplet, you may experience out-of-memory (OOM) kills:

```bash
# Add swap space (recommended for 1GB droplets)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Monitor memory usage
docker stats
free -h
```

**Recommendation**: Use at least 2GB RAM droplet for stable operation.

## Security Considerations

### Production Deployment

1. **Change default passwords**
2. **Enable MQTT authentication**
3. **Use SSL/TLS certificates**
4. **Configure proper firewall rules**
5. **Regular security updates**
6. **Monitor access logs**

### Enable MQTT Authentication

1. Create password file:
```bash
docker exec -it smart-bins-mosquitto mosquitto_passwd -c /mosquitto/config/passwd username
```

2. Update mosquitto.conf:
```
allow_anonymous false
password_file /mosquitto/config/passwd
```

3. Restart services:
```bash
docker-compose restart mosquitto
```

## Support

For issues and questions:
1. Check the logs first
2. Verify network connectivity
3. Ensure all required ports are open
4. Check DigitalOcean droplet resources (CPU, memory, disk)
