# 502 Bad Gateway Error Fix

## Problem

After running the initial Streamsheets fix, you encountered a **502 Bad Gateway** error with nginx/1.14.2.

## Root Cause

The initial fix attempted to separate MongoDB into its own service, but the Streamsheets all-in-one Docker image is not designed to work with external MongoDB services. The internal nginx proxy couldn't connect to the backend services because:

1. **Service Architecture Mismatch**: Streamsheets expects its internal MongoDB, not an external one
2. **Connection Configuration**: The all-in-one image has hardcoded internal service connections
3. **Startup Dependencies**: The separated services had timing and networking issues

## Solution

**Use the all-in-one Streamsheets image with persistent MongoDB volume mapping**

Instead of separating services, we:
1. Keep the all-in-one architecture
2. Map the internal MongoDB data directory to a persistent volume
3. Set fixed admin credentials via environment variables

## Fixed Configuration

```yaml
streamsheets:
  image: cedalo/streamsheets:latest
  volumes:
    - streamsheets_data:/var/lib/streamsheets
    - streamsheets_logs:/var/log/streamsheets
    - streamsheets_mongo:/data/db              # KEY FIX: Persistent MongoDB
  environment:
    - STREAMSHEETS_ADMIN_USER=admin
    - STREAMSHEETS_ADMIN_PASSWORD=changeme123  # Fixed credentials
```

## How to Apply the Fix

### Option 1: Run the Updated Fix Script

```bash
cd cloud-setup
./fix-streamsheets.sh
```

### Option 2: Manual Fix

```bash
# Stop all containers
docker-compose down

# Remove any problematic containers
docker-compose rm -svf mongodb streamsheets

# Clean up volumes
docker volume prune -f

# Start with corrected configuration
docker-compose up -d

# Wait for startup
sleep 30

# Check status
docker-compose ps
```

## Verification

1. **Check container status**:
   ```bash
   docker-compose ps
   ```
   Should show `streamsheets` as `Up`

2. **Check logs for errors**:
   ```bash
   docker-compose logs streamsheets
   ```
   Should not show MongoDB connection errors

3. **Access web interface**:
   - URL: `http://your-droplet-ip:8080`
   - Should load without 502 error
   - Login: admin/changeme123

## Why This Approach Works

✅ **Maintains Internal Architecture**: Uses Streamsheets as designed
✅ **Persistent Data**: MongoDB data survives container restarts
✅ **Fixed Credentials**: No more password resets
✅ **Stable Service**: No nginx proxy issues
✅ **Simple Deployment**: Single container, fewer moving parts

## Troubleshooting

If you still get 502 errors:

1. **Check memory usage**:
   ```bash
   free -h
   docker stats
   ```

2. **Verify ports are not in use**:
   ```bash
   netstat -tulpn | grep :8080
   ```

3. **Check container logs**:
   ```bash
   docker-compose logs -f streamsheets
   ```

4. **Restart services**:
   ```bash
   docker-compose restart
   ```

## Key Lesson

**Don't separate Streamsheets services** - the all-in-one image is designed to work as a single unit. The persistence issue is solved by mapping the internal MongoDB data directory to a named volume, not by separating the services.
