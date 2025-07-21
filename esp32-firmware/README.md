# ESP32 Smart Scale Firmware

## Required Libraries

Install these libraries through Arduino IDE Library Manager:

1. **WiFi** (Built-in ESP32 library)
2. **PubSubClient** by Nick O'Leary
   - For MQTT communication
   - Install via: Sketch → Include Library → Manage Libraries → Search "PubSubClient"

3. **ArduinoJson** by Benoit Blanchon
   - For JSON data formatting
   - Install via: Library Manager → Search "ArduinoJson"

4. **HX711** by Bogdan Necula
   - For load cell communication
   - Install via: Library Manager → Search "HX711"

## Hardware Connections

### ESP32 to HX711 Load Cell Amplifier
```
ESP32 Pin 4  → HX711 DOUT (Data)
ESP32 Pin 5  → HX711 SCK (Clock)
ESP32 3.3V   → HX711 VCC
ESP32 GND    → HX711 GND
```

### HX711 to Load Cells (Full Bridge Configuration)
```
HX711 E+  → Load Cell Red (Excitation+)
HX711 E-  → Load Cell Black (Excitation-)
HX711 A+  → Load Cell White (Signal+)
HX711 A-  → Load Cell Green (Signal-)
```

### Optional Buttons
```
ESP32 Pin 2  → Calibration Button → GND
ESP32 Pin 3  → Tare Button → GND
```

## Configuration

Before uploading, modify these values in `smart_scale.ino`:

```cpp
// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char* mqtt_server = "YOUR_EDGE_NODE_IP";  // Laptop/RPi IP

// Scale Configuration
const char* scale_id = "SCALE_001";           // Unique scale identifier
const char* location = "WAREHOUSE_A";         // Physical location
const char* item_type = "COMPONENTS";         // Type of items being weighed
const float item_weight = 0.5;               // Weight of single item in kg
```

## Calibration Process

1. Upload firmware to ESP32
2. Open Serial Monitor (115200 baud)
3. Remove all weight from scale
4. Hold calibration button for 3 seconds
5. Follow serial monitor instructions
6. Place known weight on scale
7. Adjust `calibration_factor` in code if needed

## Data Format

The ESP32 publishes JSON data to MQTT topic `inventory/scale/001`:

```json
{
  "scale_id": "SCALE_001",
  "location": "WAREHOUSE_A",
  "item_type": "COMPONENTS",
  "weight_kg": 2.5,
  "item_count": 5,
  "item_weight": 0.5,
  "timestamp": 123456789,
  "status": "active"
}
```

## Troubleshooting

### WiFi Connection Issues
- Check SSID and password
- Ensure ESP32 is in range of WiFi router
- Check serial monitor for connection status

### MQTT Connection Issues
- Verify edge node IP address
- Ensure MQTT broker is running on edge node
- Check firewall settings on edge node

### Scale Reading Issues
- Verify load cell connections
- Check calibration factor
- Ensure stable power supply
- Remove electrical interference sources

### Load Cell Calibration
The `calibration_factor` needs to be determined for your specific load cells:

1. Start with default value (-7050.0)
2. Place known weight on scale
3. Adjust factor until reading matches known weight
4. Typical range: -7000 to -8000 for most 50kg load cells
