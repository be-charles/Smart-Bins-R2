# Security Guide - Smart Bins IoT System

## Overview
This guide covers security best practices and credential management for the Smart Bins IoT system, including how to change default credentials and secure your deployment.

## Current Default Credentials

### Streamsheets (Cloud Platform)
- **Username**: `admin`
- **Password**: `changeme123`
- **Access**: Web UI (port 8080), MQTT Broker (port 1883)

### MQTT Broker Authentication
The edge processor connects to Streamsheets MQTT broker using the admin credentials above.

## Changing Streamsheets Credentials

### Step 1: Update Streamsheets Admin Password
1. Access Streamsheets web interface at `http://your-server-ip:8080`
2. Login with current credentials (`admin/changeme123`)
3. Navigate to Administration → User Management
4. Change the admin password to a strong, unique password

### Step 2: Update Docker Compose Configuration
Update the `cloud-setup/docker-compose.yml` file:

```yaml
environment:
  - STREAMSHEETS_ADMIN_USER=admin
  - STREAMSHEETS_ADMIN_PASSWORD=your_new_secure_password
```

### Step 3: Update Edge Processor Configuration
Update the `edge-processor/.env` file:

```env
CLOUD_MQTT_USERNAME=admin
CLOUD_MQTT_PASSWORD=your_new_secure_password
```

### Step 4: Restart Services
```bash
cd cloud-setup
docker-compose down
docker-compose up -d
```

Then restart the edge processor:
```bash
cd edge-processor
npm start
```

## Creating Additional MQTT Users

### Option 1: Streamsheets User Management
1. Access Streamsheets web interface
2. Navigate to Administration → User Management
3. Create new users with appropriate permissions
4. Update edge processor `.env` file with new credentials

### Option 2: Dedicated MQTT Users (Mosquitto)
If you want to use separate MQTT-only users:

1. Create password file:
```bash
# In cloud-setup/mosquitto/config/
mosquitto_passwd -c passwd mqtt_user
```

2. Update `mosquitto.conf`:
```conf
allow_anonymous false
password_file /mosquitto/config/passwd
```

3. Update edge processor to use port 1884 (Mosquitto) instead of 1883 (Streamsheets)

## Security Best Practices

### 1. Strong Passwords
- Use passwords with at least 12 characters
- Include uppercase, lowercase, numbers, and special characters
- Avoid common words or patterns

### 2. Environment Variables
- Never commit `.env` files with real credentials to version control
- Use `.env.example` as a template
- Consider using secrets management in production

### 3. Network Security
- Use TLS/SSL for MQTT connections in production
- Implement firewall rules to restrict access
- Consider VPN for remote access

### 4. Regular Updates
- Change default passwords immediately after deployment
- Rotate credentials periodically
- Keep Docker images and dependencies updated

## Production Deployment Checklist

- [ ] Change all default passwords
- [ ] Enable TLS/SSL for MQTT
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Implement backup procedures
- [ ] Document credential rotation schedule
- [ ] Test disaster recovery procedures

## TLS/SSL Configuration (Production)

### For Streamsheets MQTT:
1. Generate SSL certificates
2. Update docker-compose.yml with certificate volumes
3. Configure Streamsheets for SSL
4. Update edge processor to use `mqtts://` protocol

### For Mosquitto:
1. Add certificates to `mosquitto/config/`
2. Update `mosquitto.conf`:
```conf
listener 8883
protocol mqtt
cafile /mosquitto/config/ca.crt
certfile /mosquitto/config/server.crt
keyfile /mosquitto/config/server.key
```

## Troubleshooting Authentication Issues

### Common Error: "Connection refused: Not authorized"
1. Verify credentials in `.env` file
2. Check Streamsheets user management
3. Ensure MQTT broker is running
4. Check network connectivity
5. Review server logs for detailed error messages

### Testing MQTT Connection
Use mosquitto client tools to test:
```bash
mosquitto_pub -h your-server-ip -p 1883 -u admin -P your_password -t test/topic -m "test message"
```

## Emergency Access Recovery

If you lose admin access:
1. Stop Streamsheets container
2. Remove the persistent volume (WARNING: This will delete all data)
3. Restart with default credentials
4. Restore from backup if available

## Contact and Support

For security issues or questions:
- Review system logs first
- Check this guide for common solutions
- Document any security incidents
- Keep credentials secure and never share in plain text

---

**Last Updated**: January 2025
**Version**: 1.0
