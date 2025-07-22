# ESP32 Smart Scale Configuration Guide

This document explains how to configure the ESP32 Smart Scale firmware with your specific settings.

## Configuration Files

The firmware uses two configuration files to separate sensitive information from the main code:

### 1. secrets.h (Confidential Information)
This file contains sensitive information and is **ignored by git** to keep your credentials secure.

**Setup Steps:**
1. Copy `secrets.h.example` to `secrets.h`
2. Edit `secrets.h` with your actual credentials:
   - `WIFI_SSID`: Your WiFi network name
   - `WIFI_PASSWORD`: Your WiFi password
   - `MQTT_SERVER`: IP address of your MQTT broker (edge node)
   - `MQTT_CLIENT_ID`: Unique identifier for this scale

**Example:**
```c
#define WIFI_SSID "MyHomeNetwork"
#define WIFI_PASSWORD "MySecurePassword123"
#define MQTT_SERVER "192.168.1.100"
#define MQTT_CLIENT_ID "smart_scale_001"
```

### 2. config.h (Non-sensitive Configuration)
This file contains configuration parameters that can be safely committed to version control.

**Key Parameters:**
- `MQTT_PORT`: MQTT broker port (default: 1883)
- `MQTT_TOPIC`: MQTT topic for publishing data
- `SCALE_ID`: Unique identifier for this scale
- `LOCATION`: Physical location of the scale
- `ITEM_TYPE`: Type of items being weighed
- `ITEM_WEIGHT`: Weight of a single item in kg
- `CALIBRATION_FACTOR`: Load cell calibration factor
- Various timing and threshold constants

## Security Features

1. **Git Ignore**: The `secrets.h` file is automatically ignored by git
2. **Example File**: `secrets.h.example` provides a template without real credentials
3. **Separation**: Sensitive data is completely separated from the main code

## Setup Instructions

1. **Clone the repository**
2. **Navigate to esp32-firmware directory**
3. **Copy the secrets template:**
   ```bash
   cp secrets.h.example secrets.h
   ```
4. **Edit secrets.h with your actual credentials**
5. **Modify config.h if needed for your specific setup**
6. **Upload to your ESP32 using Arduino IDE or PlatformIO**

## Important Notes

- Never commit `secrets.h` to version control
- Always use the example file as a template
- Update `config.h` for different scale configurations
- The `CALIBRATION_FACTOR` will need adjustment for your specific load cells

## Troubleshooting

If you get compilation errors:
1. Ensure `secrets.h` exists (copy from `secrets.h.example`)
2. Check that all required values are defined in both config files
3. Verify ESP32 libraries are installed in your Arduino IDE
