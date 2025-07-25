# Smart Bins R2 - Streamsheets Setup Guide

Complete guide for configuring Eclipse Streamsheets for the Smart Bins inventory management system.

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ **Streamsheets installed** using the official Cedalo installer (`cedalo-install.sh`)
- ✅ **ESP32 scales configured** and publishing MQTT data
- ✅ **Edge-processor running** (optional but recommended for local data storage)
- ✅ **Network connectivity** between all components

## 🚀 Initial Setup

### 1. First Login

1. **Access Streamsheets**: `http://your-server-ip:8081`
2. **Default credentials**:
   - Username: `admin`
   - Password: `1234`
3. **Change password immediately**:
   - Go to **Administration** → **Users**
   - Click on **admin** user
   - Set a strong password
   - Save changes

### 2. System Configuration

#### Basic Settings
1. Go to **Administration** → **Settings**
2. Configure:
   - **Server Name**: `Smart Bins Control Center`
   - **Time Zone**: Set to your location
   - **Language**: Select preferred language

#### User Management (Optional)
1. **Administration** → **Users**
2. **Add New User** for operators:
   - Username: `operator`
   - Role: `User` (read-only access)
   - Password: Set secure password

## 🔌 MQTT Integration

### 1. Create MQTT Consumer Connector

1. Go to **Administration** → **Connectors**
2. Click **Add Connector**
3. Select **MQTT Consumer**
4. Configure:

```
Name: Smart Bins MQTT
Description: Receives data from ESP32 scales
Host: localhost (if using built-in broker)
Port: 1883
Client ID: streamsheets_consumer
Username: (leave empty for anonymous)
Password: (leave empty for anonymous)
```

5. **Topics to Subscribe**:
   - `inventory/+/+` (all scale data)
   - `inventory/+/+/status` (scale status updates)

6. **Test Connection** and **Save**

### 2. Verify MQTT Data Flow

1. Go to **Administration** → **Connectors**
2. Click on **Smart Bins MQTT** connector
3. Check **Status**: Should show "Connected"
4. View **Messages** tab to see incoming data

**Expected JSON format from ESP32 scales**:
```json
{
  "scale_id": "SCALE_001",
  "location": "WAREHOUSE_A",
  "item_type": "COMPONENTS",
  "weight_kg": 25.4,
  "item_count": 50,
  "item_weight": 0.5,
  "timestamp": 1642678800000,
  "status": "active"
}
```

## 📊 Creating Smart Bins Applications

### 1. Inventory Dashboard Application

#### Step 1: Create New Application
1. Click **New** → **Application**
2. Name: `Smart Bins Dashboard`
3. Description: `Real-time inventory monitoring`

#### Step 2: Add MQTT Consumer Stream
1. In the application, click **Add Stream**
2. Select **MQTT Consumer**
3. Choose **Smart Bins MQTT** connector
4. Configure:
   - **Topic**: `inventory/+/+`
   - **Name**: `InventoryStream`

#### Step 3: Create Dashboard Sheet
1. **Add Sheet** → **Dashboard**
2. Name: `Inventory Overview`
3. **Layout**: Grid (4 columns)

#### Step 4: Add Inventory Widgets

**Current Inventory Table**:
1. Add **Table** widget
2. Configure data source:
   ```javascript
   // Get latest reading for each scale
   =MQTT.CONSUMER("InventoryStream", "scale_id,location,item_type,weight_kg,item_count,timestamp")
   ```

**Weight Chart**:
1. Add **Line Chart** widget
2. Configure:
   - **X-axis**: Timestamp
   - **Y-axis**: Weight (kg)
   - **Data**: Last 24 hours of readings

**Stock Level Indicators**:
1. Add **Gauge** widgets for each location
2. Configure thresholds:
   - **Green**: > 80% capacity
   - **Yellow**: 20-80% capacity  
   - **Red**: < 20% capacity

### 2. Individual Scale Monitoring

#### Create Scale Detail Sheet
1. **Add Sheet** → **Streamsheet**
2. Name: `Scale Details`
3. **Configure cells**:

| Cell | Formula | Description |
|------|---------|-------------|
| A1 | `=JSON.VALUE(MQTT.CONSUMER, "scale_id")` | Scale ID |
| A2 | `=JSON.VALUE(MQTT.CONSUMER, "location")` | Location |
| A3 | `=JSON.VALUE(MQTT.CONSUMER, "weight_kg")` | Current Weight |
| A4 | `=JSON.VALUE(MQTT.CONSUMER, "item_count")` | Item Count |
| A5 | `=JSON.VALUE(MQTT.CONSUMER, "status")` | Scale Status |
| A6 | `=TEXT(JSON.VALUE(MQTT.CONSUMER, "timestamp")/1000/86400+25569, "yyyy-mm-dd hh:mm:ss")` | Last Update |

#### Add Status Logic
```javascript
// Cell B3: Weight Status
=IF(A3<1, "EMPTY", IF(A3>50, "FULL", "NORMAL"))

// Cell B4: Stock Level
=IF(A4<10, "LOW", IF(A4<5, "CRITICAL", "OK"))

// Cell B5: Alert Status
=IF(OR(B3="EMPTY", B4="CRITICAL"), "ALERT", "NORMAL")
```

### 3. Historical Data Analysis

#### Create Trends Sheet
1. **Add Sheet** → **Streamsheet**
2. Name: `Inventory Trends`
3. **Configure data collection**:

```javascript
// Store historical data (Cell A1)
=STORE(JSON.VALUE(MQTT.CONSUMER, "scale_id"), 
       JSON.VALUE(MQTT.CONSUMER, "timestamp"),
       JSON.VALUE(MQTT.CONSUMER, "weight_kg"),
       JSON.VALUE(MQTT.CONSUMER, "item_count"))

// Calculate daily averages (Cell B1)
=AVERAGE(FILTER(STORED_DATA, "timestamp", TODAY()))

// Trend analysis (Cell C1)
=IF(B1>AVERAGE(FILTER(STORED_DATA, "timestamp", TODAY()-7)), "INCREASING", "DECREASING")
```

## 🚨 Alert System

### 1. Low Stock Alerts

#### Create Alert Sheet
1. **Add Sheet** → **Streamsheet**
2. Name: `Stock Alerts`
3. **Configure alert logic**:

```javascript
// Cell A1: Check stock levels
=IF(JSON.VALUE(MQTT.CONSUMER, "item_count")<10, "LOW_STOCK", "OK")

// Cell A2: Send email alert (if configured)
=IF(A1="LOW_STOCK", 
   EMAIL("admin@company.com", 
         "Low Stock Alert", 
         CONCAT("Scale ", JSON.VALUE(MQTT.CONSUMER, "scale_id"), 
                " at ", JSON.VALUE(MQTT.CONSUMER, "location"), 
                " has only ", JSON.VALUE(MQTT.CONSUMER, "item_count"), " items left")),
   "")

// Cell A3: Log alert
=IF(A1="LOW_STOCK", 
   LOG("ALERT", CONCAT("Low stock: ", JSON.VALUE(MQTT.CONSUMER, "scale_id"))),
   "")
```

### 2. Scale Offline Detection

```javascript
// Cell B1: Check last update time
=IF((NOW()-JSON.VALUE(MQTT.CONSUMER, "timestamp")/1000/86400)>0.0417, "OFFLINE", "ONLINE")

// Cell B2: Offline alert
=IF(B1="OFFLINE",
   EMAIL("admin@company.com",
         "Scale Offline Alert",
         CONCAT("Scale ", JSON.VALUE(MQTT.CONSUMER, "scale_id"), " has been offline for more than 1 hour")),
   "")
```

## 📈 Advanced Features

### 1. Inventory Forecasting

#### Consumption Rate Analysis
```javascript
// Calculate daily consumption rate
=AVERAGE(DIFF(FILTER(STORED_DATA, "scale_id", "SCALE_001"), "item_count", 1))

// Predict stock-out date
=TODAY() + (JSON.VALUE(MQTT.CONSUMER, "item_count") / ABS(consumption_rate))

// Reorder recommendation
=IF(predicted_stockout < TODAY()+7, "ORDER_NOW", "OK")
```

### 2. Multi-Location Summary

#### Location Overview Sheet
```javascript
// Total inventory by location
=SUMIF(MQTT.CONSUMER_ARRAY, "location", "WAREHOUSE_A", "item_count")

// Average weight by location
=AVERAGEIF(MQTT.CONSUMER_ARRAY, "location", "WAREHOUSE_A", "weight_kg")

// Active scales by location
=COUNTIF(MQTT.CONSUMER_ARRAY, "location", "WAREHOUSE_A")
```

### 3. Data Export

#### Export Configuration
1. Go to **Administration** → **Export**
2. **Add Export Job**:
   - **Name**: `Daily Inventory Report`
   - **Format**: CSV
   - **Schedule**: Daily at 6:00 AM
   - **Data**: All scale readings from previous day
   - **Destination**: Email or FTP

## 🔧 Troubleshooting

### Common Issues

#### 1. No MQTT Data Received
**Symptoms**: Empty dashboards, no data in connectors
**Solutions**:
1. Check MQTT connector status
2. Verify ESP32 scales are publishing
3. Test MQTT connection:
   ```bash
   mosquitto_sub -h your-server-ip -p 1883 -t "inventory/+/+"
   ```

#### 2. Incorrect Data Display
**Symptoms**: Wrong values, formatting issues
**Solutions**:
1. Check JSON structure in MQTT messages
2. Verify cell formulas
3. Test with sample data

#### 3. Alerts Not Working
**Symptoms**: No email notifications
**Solutions**:
1. Configure SMTP settings in Administration
2. Test email configuration
3. Check alert logic in sheets

### Performance Optimization

#### 1. Reduce Update Frequency
- Set ESP32 scales to publish every 5-10 seconds instead of 1 second
- Use data aggregation in Streamsheets

#### 2. Data Retention
- Configure automatic data cleanup
- Archive old data to external storage

#### 3. Resource Monitoring
- Monitor CPU and memory usage
- Scale server resources if needed

## 📚 Useful Streamsheets Functions

### MQTT Functions
```javascript
// Get specific field from MQTT message
JSON.VALUE(MQTT.CONSUMER, "field_name")

// Get array of all messages
MQTT.CONSUMER_ARRAY

// Filter MQTT data
FILTER(MQTT.CONSUMER_ARRAY, "field", "value")
```

### Data Processing
```javascript
// Calculate averages
AVERAGE(range)

// Count items
COUNT(range)

// Sum values
SUM(range)

// Find minimum/maximum
MIN(range) / MAX(range)
```

### Time Functions
```javascript
// Current timestamp
NOW()

// Format timestamp
TEXT(timestamp, "yyyy-mm-dd hh:mm:ss")

// Date calculations
TODAY() + 7  // 7 days from today
```

### Conditional Logic
```javascript
// Simple IF statement
IF(condition, true_value, false_value)

// Multiple conditions
IF(AND(condition1, condition2), value1, 
   IF(OR(condition3, condition4), value2, value3))

// Switch-like logic
SWITCH(value, case1, result1, case2, result2, default)
```

## 🎯 Best Practices

### 1. Sheet Organization
- **Use descriptive names** for sheets and cells
- **Group related functionality** in the same sheet
- **Document complex formulas** with comments

### 2. Data Management
- **Implement data validation** to catch errors
- **Use consistent naming conventions**
- **Regular backups** of Streamsheets configuration

### 3. Performance
- **Minimize real-time calculations** where possible
- **Use appropriate update intervals**
- **Monitor system resources**

### 4. Security
- **Change default passwords**
- **Use HTTPS** in production
- **Implement user access controls**
- **Regular security updates**

## 📞 Support and Resources

### Official Documentation
- **Streamsheets Docs**: https://docs.cedalo.com/streamsheets/
- **MQTT Reference**: https://mqtt.org/
- **Function Reference**: Available in Streamsheets help

### Smart Bins Specific
- **ESP32 Firmware**: See `esp32-firmware/README.md`
- **Edge Processor**: See `edge-processor/README.md`
- **Installation Guide**: See `cloud-setup/OFFICIAL_INSTALLER_GUIDE.md`

### Community Support
- **Streamsheets Forum**: https://forum.cedalo.com/
- **GitHub Issues**: For Smart Bins specific issues

---

## 🎉 Quick Start Checklist

- [ ] Streamsheets installed and accessible
- [ ] Default password changed
- [ ] MQTT connector configured and connected
- [ ] First dashboard created
- [ ] ESP32 scales publishing data
- [ ] Data visible in Streamsheets
- [ ] Basic alerts configured
- [ ] System tested end-to-end

**Congratulations!** Your Smart Bins inventory management system is now fully operational with Streamsheets providing real-time monitoring, alerting, and analytics capabilities.
