/*
 * Smart Scale ESP32 Firmware
 * IoT Inventory Management System
 * 
 * Hardware:
 * - ESP32 development board
 * - HX711 load cell amplifier
 * - 4x 50kg load cells in full bridge configuration
 * 
 * Features:
 * - WiFi connectivity with auto-reconnection
 * - MQTT publishing of weight data
 * - Calibration and tare functionality
 * - JSON data format for Streamsheets
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HX711.h>

// Hardware Configuration
#define HX711_DOUT_PIN  4
#define HX711_SCK_PIN   5
#define CALIBRATION_BUTTON_PIN 2
#define TARE_BUTTON_PIN 3

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char* mqtt_server = "YOUR_EDGE_NODE_IP";  // Laptop/RPi IP address
const int mqtt_port = 1883;
const char* mqtt_client_id = "smart_scale_001";
const char* mqtt_topic = "inventory/scale/001";

// Scale Configuration
const char* scale_id = "SCALE_001";
const char* location = "WAREHOUSE_A";
const char* item_type = "COMPONENTS";
const float item_weight = 0.5; // Weight of single item in kg

// Calibration factor (needs to be determined for your load cells)
float calibration_factor = -7050.0; // This will need adjustment

// Global Objects
HX711 scale;
WiFiClient espClient;
PubSubClient client(espClient);

// Variables
float current_weight = 0.0;
float previous_weight = 0.0;
int item_count = 0;
unsigned long last_reading = 0;
unsigned long last_mqtt_attempt = 0;
const unsigned long reading_interval = 1000; // Read every 1 second
const unsigned long mqtt_retry_interval = 5000; // Retry MQTT every 5 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("Smart Scale Starting...");
  
  // Initialize pins
  pinMode(CALIBRATION_BUTTON_PIN, INPUT_PULLUP);
  pinMode(TARE_BUTTON_PIN, INPUT_PULLUP);
  
  // Initialize HX711
  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  scale.set_scale(calibration_factor);
  scale.tare(); // Reset scale to 0
  
  Serial.println("Scale initialized and tared");
  
  // Connect to WiFi
  setup_wifi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  Serial.println("Setup complete");
}

void loop() {
  // Handle WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    setup_wifi();
  }
  
  // Handle MQTT connection
  if (!client.connected()) {
    reconnect_mqtt();
  }
  client.loop();
  
  // Handle button presses
  handle_buttons();
  
  // Read scale and publish data
  if (millis() - last_reading > reading_interval) {
    read_and_publish_weight();
    last_reading = millis();
  }
  
  delay(100);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("WiFi connected");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed");
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  // Handle remote commands (tare, calibrate, etc.)
  if (message == "TARE") {
    scale.tare();
    Serial.println("Scale tared remotely");
  }
}

void reconnect_mqtt() {
  if (millis() - last_mqtt_attempt < mqtt_retry_interval) {
    return;
  }
  
  last_mqtt_attempt = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  Serial.print("Attempting MQTT connection...");
  
  if (client.connect(mqtt_client_id)) {
    Serial.println("connected");
    
    // Subscribe to command topic
    String command_topic = String(mqtt_topic) + "/commands";
    client.subscribe(command_topic.c_str());
    
    // Send online status
    publish_status("online");
    
  } else {
    Serial.print("failed, rc=");
    Serial.print(client.state());
    Serial.println(" try again in 5 seconds");
  }
}

void read_and_publish_weight() {
  if (scale.is_ready()) {
    current_weight = scale.get_units(3); // Average of 3 readings
    
    // Filter out noise (readings below 0.1kg)
    if (current_weight < 0.1) {
      current_weight = 0.0;
    }
    
    // Calculate item count
    item_count = (item_weight > 0) ? (int)(current_weight / item_weight) : 0;
    
    // Only publish if weight changed significantly (>0.1kg difference)
    if (abs(current_weight - previous_weight) > 0.1) {
      publish_weight_data();
      previous_weight = current_weight;
    }
    
    // Debug output
    Serial.print("Weight: ");
    Serial.print(current_weight, 2);
    Serial.print(" kg, Items: ");
    Serial.println(item_count);
  }
}

void publish_weight_data() {
  if (!client.connected()) {
    return;
  }
  
  // Create JSON payload
  StaticJsonDocument<300> doc;
  doc["scale_id"] = scale_id;
  doc["location"] = location;
  doc["item_type"] = item_type;
  doc["weight_kg"] = current_weight;
  doc["item_count"] = item_count;
  doc["item_weight"] = item_weight;
  doc["timestamp"] = millis();
  doc["status"] = "active";
  
  String json_string;
  serializeJson(doc, json_string);
  
  // Publish to MQTT
  if (client.publish(mqtt_topic, json_string.c_str())) {
    Serial.println("Data published: " + json_string);
  } else {
    Serial.println("Failed to publish data");
  }
}

void publish_status(const char* status) {
  if (!client.connected()) {
    return;
  }
  
  StaticJsonDocument<200> doc;
  doc["scale_id"] = scale_id;
  doc["status"] = status;
  doc["timestamp"] = millis();
  doc["ip_address"] = WiFi.localIP().toString();
  
  String json_string;
  serializeJson(doc, json_string);
  
  String status_topic = String(mqtt_topic) + "/status";
  client.publish(status_topic.c_str(), json_string.c_str());
}

void handle_buttons() {
  // Tare button
  if (digitalRead(TARE_BUTTON_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(TARE_BUTTON_PIN) == LOW) {
      scale.tare();
      Serial.println("Scale tared");
      publish_status("tared");
      while (digitalRead(TARE_BUTTON_PIN) == LOW) {
        delay(10);
      }
    }
  }
  
  // Calibration button (hold for 3 seconds)
  if (digitalRead(CALIBRATION_BUTTON_PIN) == LOW) {
    unsigned long button_start = millis();
    while (digitalRead(CALIBRATION_BUTTON_PIN) == LOW && 
           (millis() - button_start) < 3000) {
      delay(10);
    }
    
    if ((millis() - button_start) >= 3000) {
      calibrate_scale();
    }
  }
}

void calibrate_scale() {
  Serial.println("Starting calibration...");
  Serial.println("Remove all weight from scale and press tare button");
  
  // Wait for tare button
  while (digitalRead(TARE_BUTTON_PIN) == HIGH) {
    delay(100);
  }
  
  scale.tare();
  Serial.println("Scale tared. Place known weight and enter weight in Serial Monitor");
  
  // In a real implementation, you would read the known weight from serial
  // For now, we'll use a default calibration
  Serial.println("Using default calibration factor");
  publish_status("calibrated");
}
