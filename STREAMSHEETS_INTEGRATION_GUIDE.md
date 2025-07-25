# Streamsheets Integration Guide - Smart Bins System

This guide will help you set up Streamsheets to receive and process data from your ESP32 smart scales.

## Current Data Flow

Your system is already configured with the complete data pipeline:

```
ESP32 Scale → Local MQTT Broker → Edge Processor → Cloud MQTT → Streamsheets
```

**Data Details:**
- **Cloud MQTT Host:** `188.166.200.18:1883`
- **MQTT Username:** `streamsheets`
- **MQTT Topics:** `inventory/scale/+` and `inventory/scale/+/status`
- **Data Format:** JSON with scale readings and status updates

## Step 1: Verify Data Flow

First, let's confirm your ESP32 data is reaching Streamsheets:

### Check Edge Processor Logs
Look for these messages in your edge processor terminal:
```
☁️  Forwarded scale data to cloud: SCALE_001
```

If you don't see forwarding messages, the ESP32 might only be sending status updates. Let's trigger some scale data.

### Test Scale Data Generation
On your ESP32, try:
1. **Place weight on the scale** - This should trigger weight readings
2. **Check serial monitor** for messages like:
   ```
   Weight: 2.50 kg, Items: 5
   Data published: {"scale_id":"SCALE_001",...}
   ```

## Step 2: Create Streamsheets Application

### Access Streamsheets
1. **Open your Streamsheets instance** in a web browser
2. **Log in** with your credentials

### Create New Application
1. **Click "New Application"** or the "+" button
2. **Name:** `Smart Bins Inventory`
3. **Description:** `IoT inventory management system with ESP32 smart scales`

### Create Machine
1. **Click "Add Machine"** in your new application
2. **Name:** `Scale Data Processor`
3. **Template:** Start with blank template

## Step 3: Configure MQTT Consumer

### Add MQTT Stream
1. **In your machine, click "Add Stream"**
2. **Select "MQTT Consumer"**
3. **Configure the connection:**

```
Connection Settings:
- Name: Smart Bins MQTT
- Host: 188.166.200.18
- Port: 1883
- Username: streamsheets
- Password: 5I8CCB1bb5
- Client ID: streamsheets_smartbins_001
```

### Subscribe to Topics
Add these topic subscriptions:

**Topic 1: Scale Data**
```
Topic: inventory/scale/+
QoS: 1
Name: scale_readings
```

**Topic 2: Status Updates**
```
Topic: inventory/scale/+/status  
QoS: 1
Name: scale_status
```

## Step 4: Set Up Data Processing Sheet

### Create Processing Sheet
1. **Add a new sheet** called "Scale Data Processing"
2. **Set up the following structure:**

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| **Scale ID** | **Location** | **Item Type** | **Weight (kg)** | **Item Count** | **Item Weight** | **Timestamp** | **Status** | **Last Update** |

### Configure Data Mapping
In cell **A2**, add this formula to extract scale ID:
```
=JSON.VALUE(MQTT.MESSAGE("scale_readings"),"scale_id")
```

In cell **B2**, add location:
```
=JSON.VALUE(MQTT.MESSAGE("scale_readings"),"location")
```

In cell **C2**, add item type:
```
=JSON.VALUE(MQTT.MESSAGE("scale_readings"),"item_type")
```

In cell **D2**, add weight:
```
=JSON.VALUE(MQTT.MESSAGE("scale_readings"),"weight_kg")
```

In cell **E2**, add item count:
```
=JSON.VALUE(MQTT.MESSAGE("scale_readings"),"item_count")
```

In cell **F2**, add item weight:
```
=JSON.VALUE(MQTT.MESSAGE("scale_readings"),"item_weight")
```

In cell **G2**, add timestamp:
```
=JSON.VALUE(MQTT.MESSAGE("scale_readings"),"timestamp")
```

In cell **H2**, add status:
```
=JSON.VALUE(MQTT.MESSAGE("scale_readings"),"status")
```

In cell **I2**, add current time:
```
=NOW()
```

## Step 5: Create Dashboard Sheet

### Add Dashboard Sheet
1. **Create a new sheet** called "Inventory Dashboard"
2. **Set up summary view:**

| A | B | C |
|---|---|---|
| **Metric** | **Value** | **Status** |
| Total Scales | =COUNTA(ScaleData.A:A)-1 | |
| Active Scales | =COUNTIF(ScaleData.H:H,"active") | |
| Total Weight | =SUM(ScaleData.D:D) | kg |
| Total Items | =SUM(ScaleData.E:E) | units |

### Add Real-time Indicators
Create cells that show:
- **Last Update:** `=MAX(ScaleData.I:I)`
- **Scale Status:** Use conditional formatting for active/inactive scales
- **Low Inventory Alerts:** Highlight scales with low item counts

## Step 6: Set Up Alerts and Automation

### Low Inventory Alert
1. **Add a new sheet** called "Alerts"
2. **Create formula** to detect low inventory:
```
=IF(ScaleData.E2<5,"LOW INVENTORY: "&ScaleData.A2,"")
```

### Email Notifications (Optional)
Configure email alerts for:
- Scale offline status
- Low inventory levels
- System errors

## Step 7: Testing and Validation

### Test Data Reception
1. **Place weight on your ESP32 scale**
2. **Check Streamsheets** for incoming data
3. **Verify** all fields are populated correctly

### Expected Data Format
Your ESP32 sends data in this JSON format:
```json
{
  "scale_id": "SCALE_001",
  "location": "WAREHOUSE_A", 
  "item_type": "COMPONENTS",
  "weight_kg": 2.5,
  "item_count": 5,
  "item_weight": 0.5,
  "timestamp": 277334,
  "status": "active"
}
```

### Status Updates Format
```json
{
  "scale_id": "SCALE_001",
  "status": "calibrated",
  "timestamp": 277334,
  "ip_address": "192.168.8.150"
}
```

## Step 8: Advanced Features

### Historical Data Tracking
1. **Create a data log sheet** to store historical readings
2. **Use APPEND function** to log each reading:
```
=APPEND(HistoryLog.A:I, ScaleData.A2:I2)
```

### Trend Analysis
Add charts to visualize:
- Weight trends over time
- Item count changes
- Scale utilization patterns

### Multi-Scale Support
Your system supports multiple scales. Each scale will have a unique:
- **Scale ID:** SCALE_001, SCALE_002, etc.
- **Location:** Different warehouse areas
- **Item Type:** Different product categories

## Troubleshooting

### No Data Appearing in Streamsheets

**Check 1: MQTT Connection**
- Verify MQTT consumer is connected
- Check connection status in Streamsheets

**Check 2: Topic Subscriptions**
- Ensure topics match: `inventory/scale/+`
- Check QoS settings (use QoS 1)

**Check 3: Edge Processor**
- Look for "Forwarded scale data to cloud" messages
- Check `/api/status` endpoint for cloud connection status

**Check 4: ESP32 Data Generation**
- Verify ESP32 is sending actual scale data (not just status)
- Place weight on scale to trigger readings

### Data Format Issues

**JSON Parsing Errors:**
- Check JSON.VALUE formulas for correct field names
- Verify data structure matches expected format

**Missing Fields:**
- Some messages might be status-only (no weight data)
- Filter for messages with weight_kg field

### Connection Problems

**MQTT Authentication:**
- Username: `streamsheets`
- Password: `5I8CCB1bb5`
- Host: `188.166.200.18:1883`

**Firewall Issues:**
- Ensure port 1883 is accessible
- Check network connectivity to cloud MQTT broker

## Next Steps

1. **Test the complete pipeline** with real scale data
2. **Create additional visualizations** as needed
3. **Set up automated reports** for inventory management
4. **Configure alerts** for critical inventory levels
5. **Add more scales** to expand the system

Your Smart Bins system is now ready to provide real-time inventory monitoring through Streamsheets!

## Sample Streamsheets Formulas Reference

### Data Extraction
```
Scale ID: =JSON.VALUE(MQTT.MESSAGE("scale_readings"),"scale_id")
Weight: =JSON.VALUE(MQTT.MESSAGE("scale_readings"),"weight_kg")
Items: =JSON.VALUE(MQTT.MESSAGE("scale_readings"),"item_count")
Status: =JSON.VALUE(MQTT.MESSAGE("scale_readings"),"status")
```

### Calculations
```
Total Weight: =SUM(D:D)
Average Weight: =AVERAGE(D:D)
Low Stock Alert: =IF(E2<5,"ALERT","OK")
Last Update: =TEXT(NOW(),"yyyy-mm-dd hh:mm:ss")
```

### Conditional Formatting
- **Green:** Active scales (status = "active")
- **Red:** Offline scales or low inventory
- **Yellow:** Scales needing calibration

This setup will give you a comprehensive real-time inventory monitoring system using your ESP32 smart scales and Streamsheets!
