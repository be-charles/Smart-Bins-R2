const express = require('express');
const mqtt = require('mqtt');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.WEB_PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/inventory.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(DB_PATH);

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS scale_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scale_id TEXT NOT NULL,
      location TEXT NOT NULL,
      item_type TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      item_count INTEGER NOT NULL,
      item_weight REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/scales', (req, res) => {
  db.all(
    'SELECT DISTINCT scale_id, location FROM scale_readings ORDER BY scale_id',
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.get('/api/scales/:scaleId/readings', (req, res) => {
  const { scaleId } = req.params;
  const limit = req.query.limit || 100;
  
  db.all(
    'SELECT * FROM scale_readings WHERE scale_id = ? ORDER BY timestamp DESC LIMIT ?',
    [scaleId, limit],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.get('/api/dashboard', (req, res) => {
  db.all(
    `SELECT 
      scale_id, 
      location, 
      item_type,
      weight_kg, 
      item_count, 
      MAX(timestamp) as last_reading
    FROM scale_readings 
    GROUP BY scale_id 
    ORDER BY scale_id`,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    nodeId: process.env.EDGE_NODE_ID || 'edge_001'
  });
});

// MQTT status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    local: {
      connected: localConnectionStatus.connected,
      lastConnected: localConnectionStatus.lastConnected,
      lastError: localConnectionStatus.lastError,
      reconnectAttempts: localConnectionStatus.reconnectAttempts,
      host: process.env.LOCAL_MQTT_HOST,
      port: process.env.LOCAL_MQTT_PORT || 1883
    },
    cloud: {
      connected: cloudConnectionStatus.connected,
      lastConnected: cloudConnectionStatus.lastConnected,
      lastError: cloudConnectionStatus.lastError,
      reconnectAttempts: cloudConnectionStatus.reconnectAttempts,
      host: process.env.CLOUD_MQTT_HOST,
      port: process.env.CLOUD_MQTT_PORT || 1883
    },
    edge: {
      nodeId: process.env.EDGE_NODE_ID || 'edge_001',
      location: process.env.LOCATION || 'Unknown',
      uptime: process.uptime(),
      timestamp: Date.now()
    }
  });
});

// MQTT Connections
let localMqttClient = null;
let cloudMqttClient = null;

let localConnectionStatus = {
  connected: false,
  lastConnected: null,
  lastError: null,
  reconnectAttempts: 0
};

let cloudConnectionStatus = {
  connected: false,
  lastConnected: null,
  lastError: null,
  reconnectAttempts: 0
};

function connectToLocal() {
  const localHost = process.env.LOCAL_MQTT_HOST;
  if (!localHost) {
    console.log('⚠️  Local MQTT not configured');
    return;
  }

  console.log('🏠 Connecting to local MQTT broker...');
  console.log(`📍 Host: ${localHost}:${process.env.LOCAL_MQTT_PORT || 1883}`);
  console.log(`👤 Username: ${process.env.LOCAL_MQTT_USERNAME}`);
  console.log(`🔑 Password: ${process.env.LOCAL_MQTT_PASSWORD ? '[SET]' : '[NOT SET]'}`);
  
  const mqttOptions = {
    connectTimeout: 10000,
    reconnectPeriod: 5000
  };
  
  // Add authentication if credentials are provided
  if (process.env.LOCAL_MQTT_USERNAME && process.env.LOCAL_MQTT_PASSWORD) {
    mqttOptions.username = process.env.LOCAL_MQTT_USERNAME;
    mqttOptions.password = process.env.LOCAL_MQTT_PASSWORD;
    console.log(`👤 Using local authentication: ${process.env.LOCAL_MQTT_USERNAME}`);
  } else {
    console.log('🔓 Using anonymous local MQTT connection');
  }
  
  localMqttClient = mqtt.connect(`mqtt://${localHost}:${process.env.LOCAL_MQTT_PORT || 1883}`, mqttOptions);
  
  localMqttClient.on('connect', () => {
    console.log('✅ Connected to local MQTT broker');
    localConnectionStatus.connected = true;
    localConnectionStatus.lastConnected = Date.now();
    localConnectionStatus.lastError = null;
    localConnectionStatus.reconnectAttempts = 0;
    
    // Subscribe to ESP32 scale topics
    localMqttClient.subscribe('inventory/scale/+');
    localMqttClient.subscribe('inventory/scale/+/status');
    localMqttClient.subscribe('inventory/scale/+/commands');
    console.log('📡 Subscribed to ESP32 scale topics');
  });
  
  localMqttClient.on('disconnect', () => {
    console.log('🔌 Disconnected from local MQTT broker');
    localConnectionStatus.connected = false;
  });
  
  localMqttClient.on('offline', () => {
    console.log('📴 Local MQTT broker offline');
    localConnectionStatus.connected = false;
  });
  
  localMqttClient.on('reconnect', () => {
    console.log('🔄 Attempting to reconnect to local MQTT broker...');
    localConnectionStatus.reconnectAttempts++;
  });
  
  localMqttClient.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received from ESP32:', topic, data);
      
      // Handle different message types
      if (topic.includes('/status')) {
        console.log('📊 ESP32 status update:', data);
      } else if (topic.startsWith('inventory/scale/')) {
        // This is scale data - save to database and forward to cloud
        handleScaleData(topic, data);
      }
    } catch (error) {
      console.error('❌ Error parsing local MQTT message:', error);
      console.error('Raw message:', message.toString());
    }
  });
  
  localMqttClient.on('error', (error) => {
    console.error('❌ Local MQTT error:', error);
    localConnectionStatus.connected = false;
    localConnectionStatus.lastError = error.message;
  });
}

function connectToCloud() {
  const cloudHost = process.env.CLOUD_MQTT_HOST;
  if (!cloudHost) {
    console.log('⚠️  Cloud MQTT not configured');
    return;
  }

  console.log('☁️  Connecting to cloud MQTT...');
  console.log(`📍 Host: ${cloudHost}:${process.env.CLOUD_MQTT_PORT || 1883}`);
  console.log(`👤 Username: ${process.env.CLOUD_MQTT_USERNAME}`);
  console.log(`🔑 Password: ${process.env.CLOUD_MQTT_PASSWORD ? '[SET]' : '[NOT SET]'}`);
  
  // Only include authentication if credentials are provided
  const mqttOptions = {
    connectTimeout: 30000,
    reconnectPeriod: 5000
  };
  
  // Add authentication only if both username and password are provided
  if (process.env.CLOUD_MQTT_USERNAME && process.env.CLOUD_MQTT_PASSWORD) {
    mqttOptions.username = process.env.CLOUD_MQTT_USERNAME;
    mqttOptions.password = process.env.CLOUD_MQTT_PASSWORD;
    console.log(`👤 Using cloud authentication: ${process.env.CLOUD_MQTT_USERNAME}`);
  } else {
    console.log('🔓 Using anonymous cloud MQTT connection');
  }
  
  cloudMqttClient = mqtt.connect(`mqtt://${cloudHost}:${process.env.CLOUD_MQTT_PORT || 1883}`, mqttOptions);
  
  cloudMqttClient.on('connect', () => {
    console.log('✅ Connected to cloud MQTT');
    cloudConnectionStatus.connected = true;
    cloudConnectionStatus.lastConnected = Date.now();
    cloudConnectionStatus.lastError = null;
    cloudConnectionStatus.reconnectAttempts = 0;
    cloudMqttClient.subscribe('inventory/+/+/commands');
  });
  
  cloudMqttClient.on('disconnect', () => {
    console.log('🔌 Disconnected from cloud MQTT');
    cloudConnectionStatus.connected = false;
  });
  
  cloudMqttClient.on('offline', () => {
    console.log('📴 Cloud MQTT offline');
    cloudConnectionStatus.connected = false;
  });
  
  cloudMqttClient.on('reconnect', () => {
    console.log('🔄 Attempting to reconnect to cloud MQTT...');
    cloudConnectionStatus.reconnectAttempts++;
  });
  
  cloudMqttClient.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received from cloud:', topic, data);
      
      // Forward cloud commands to local ESP32 devices
      if (topic.includes('/commands')) {
        forwardCommandToLocal(topic, data);
      }
    } catch (error) {
      console.error('❌ Error parsing cloud message:', error);
    }
  });
  
  cloudMqttClient.on('error', (error) => {
    console.error('❌ Cloud MQTT error:', error);
    cloudConnectionStatus.connected = false;
    cloudConnectionStatus.lastError = error.message;
  });
}

// Handle scale data from ESP32
function handleScaleData(topic, data) {
  try {
    // Save to local database
    saveScaleReading(data);
    
    // Forward to cloud if connected
    if (cloudMqttClient && cloudConnectionStatus.connected) {
      const cloudTopic = topic; // Use same topic structure
      cloudMqttClient.publish(cloudTopic, JSON.stringify(data), { qos: 1 }, (error) => {
        if (error) {
          console.error('❌ Failed to forward data to cloud:', error);
        } else {
          console.log('☁️  Forwarded scale data to cloud:', data.scale_id, 'TOPIC:', cloudTopic);
        }
      });
    } else {
      console.log('⚠️  Cloud not connected - data saved locally only');
    }
  } catch (error) {
    console.error('❌ Error handling scale data:', error);
  }
}

// Forward commands from cloud to local ESP32
function forwardCommandToLocal(topic, data) {
  if (localMqttClient && localConnectionStatus.connected) {
    // Convert cloud topic to local topic format
    const localTopic = topic.replace('/commands', '/commands');
    localMqttClient.publish(localTopic, JSON.stringify(data), { qos: 1 }, (error) => {
      if (error) {
        console.error('❌ Failed to forward command to local:', error);
      } else {
        console.log('🏠 Forwarded command to local ESP32:', localTopic);
      }
    });
  } else {
    console.log('⚠️  Local MQTT not connected - cannot forward command');
  }
}

// Function to save scale reading to database
function saveScaleReading(data) {
  const stmt = db.prepare(`
    INSERT INTO scale_readings 
    (scale_id, location, item_type, weight_kg, item_count, item_weight, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run([
    data.scale_id,
    data.location,
    data.item_type,
    data.weight_kg,
    data.item_count,
    data.item_weight,
    data.timestamp,
    data.status
  ]);
  
  stmt.finalize();
  console.log('💾 Saved scale reading:', data.scale_id);
}

// Start server
connectToLocal();
connectToCloud();

app.listen(PORT, () => {
  console.log(`🚀 Edge Processor running on port ${PORT}`);
  console.log(`📊 Database: ${DB_PATH}`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Edge Processor...');
  
  if (localMqttClient) {
    console.log('🏠 Closing local MQTT connection...');
    localMqttClient.end();
  }
  
  if (cloudMqttClient) {
    console.log('☁️  Closing cloud MQTT connection...');
    cloudMqttClient.end();
  }
  
  if (db) {
    console.log('💾 Closing database connection...');
    db.close();
  }
  
  console.log('✅ Shutdown complete');
  process.exit(0);
});
