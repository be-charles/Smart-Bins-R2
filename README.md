# Smart Bins R2 - IoT Inventory Management System

A real-time inventory management system using ESP32 load cell sensors, edge computing, and Eclipse Streamsheets for visualization.

## Architecture

```
ESP32 + Load Cells → [WiFi] → Edge Node (Laptop/RPi) → [Internet] → DigitalOcean Streamsheets
```

## Components

### 1. IoT Layer (`/esp32-firmware`)
- ESP32 microcontrollers with HX711 load cell amplifiers
- Real-time weight measurement and MQTT publishing
- WiFi connectivity and auto-reconnection

### 2. Edge Layer (`/edge-processor`)
- MQTT broker (Eclipse Mosquitto)
- Data processing and aggregation
- Local backup and cloud forwarding

### 3. Cloud Layer (`/cloud-setup`)
- Eclipse Streamsheets on DigitalOcean
- Real-time dashboard and analytics
- Multi-location inventory tracking

## Quick Start

1. **Setup Cloud**: Deploy Streamsheets to DigitalOcean
2. **Setup Edge**: Install MQTT broker and edge processor
3. **Setup ESP32**: Flash firmware and configure sensors
4. **Configure Streamsheets**: Create inventory dashboards

## 📚 Documentation

### Setup Guides
- **[Cloud Installation](cloud-setup/OFFICIAL_INSTALLER_GUIDE.md)** - Official Cedalo installer for reliable deployment
- **[Streamsheets Configuration](STREAMSHEETS_SETUP_GUIDE.md)** - Complete guide for creating dashboards, alerts, and analytics
- **[ESP32 Firmware](esp32-firmware/README.md)** - Hardware setup and firmware configuration
- **[Edge Processor](edge-processor/README.md)** - Local MQTT broker and data processing

### Key Features
- **Real-time Monitoring**: Live inventory levels and weight tracking
- **Multi-location Support**: Monitor multiple warehouses/locations
- **Smart Alerts**: Low stock notifications and offline device detection
- **Historical Analytics**: Consumption trends and forecasting
- **Data Export**: Automated reports and external system integration

## Hardware Requirements

- ESP32 development boards
- HX711 load cell amplifiers
- 50kg load cells (4 per scale)
- Laptop/Raspberry Pi for edge processing
- DigitalOcean droplet for cloud services

## Software Stack

- **ESP32**: Arduino IDE, C++
- **Edge**: Node.js, Eclipse Mosquitto, Docker
- **Cloud**: Eclipse Streamsheets, MQTT, MongoDB
- **Communication**: MQTT protocol over WiFi/Internet
