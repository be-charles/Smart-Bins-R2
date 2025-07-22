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

// Include configuration files
#include "config.h"
#include "secrets.h"

// Hardware Configuration
#define HX711_DOUT_PIN  4
#define HX711_SCK_PIN   5
#define CALIBRATION_BUTTON_PIN 2
#define TARE_BUTTON_PIN 3

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

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  Serial.println("Smart Scale Starting...");
  
  // Initialize pins
  pinMode(CALIBRATION_BUTTON_PIN, INPUT_PULLUP);
  pinMode(TARE_BUTTON_PIN, INPUT_PULLUP);
  
  // Initialize HX711
  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(); // Reset scale to 0
  
  Serial.println("Scale initialized and tared");
  
  // Connect to WiFi
  setup_wifi();
  
  // Setup MQTT
  client.setServer(MQTT_SERVER, MQTT_PORT);
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
  if (millis() - last_reading > READING_INTERVAL) {
    read_and_publish_weight();
    last_reading = millis();
  }
  
  delay(MAIN_LOOP_DELAY);
}

void setup_wifi() {
  delay(SETUP_DELAY);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < MAX_WIFI_ATTEMPTS) {
    delay(WIFI_CONNECT_DELAY);
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
  if (millis() - last_mqtt_attempt < MQTT_RETRY_INTERVAL) {
    return;
  }
  
  last_mqtt_attempt = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  Serial.print("Attempting MQTT connection...");
  
  if (client.connect(MQTT_CLIENT_ID)) {
    Serial.println("connected");
    
    // Subscribe to command topic
    String command_topic = String(MQTT_TOPIC) + "/commands";
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
    current_weight = scale.get_units(SCALE_READINGS_AVERAGE); // Average of readings
    
    // Filter out noise (readings below threshold)
    if (current_weight < WEIGHT_NOISE_THRESHOLD) {
      current_weight = 0.0;
    }
    
    // Calculate item count
    item_count = (ITEM_WEIGHT > 0) ? (int)(current_weight / ITEM_WEIGHT) : 0;
    
    // Only publish if weight changed significantly
    if (abs(current_weight - previous_weight) > WEIGHT_CHANGE_THRESHOLD) {
      publish_weight_data();
      previous_weight = current_weight;
    }
    
    // Debug output
    Serial.print("Weight: ");
    Serial.print(current_weight, WEIGHT_DECIMAL_PLACES);
    Serial.print(" kg, Items: ");
    Serial.println(item_count);
  }
}

void publish_weight_data() {
  if (!client.connected()) {
    return;
  }
  
  // Create JSON payload
  StaticJsonDocument<WEIGHT_JSON_SIZE> doc;
  doc["scale_id"] = SCALE_ID;
  doc["location"] = LOCATION;
  doc["item_type"] = ITEM_TYPE;
  doc["weight_kg"] = current_weight;
  doc["item_count"] = item_count;
  doc["item_weight"] = ITEM_WEIGHT;
  doc["timestamp"] = millis();
  doc["status"] = "active";
  
  String json_string;
  serializeJson(doc, json_string);
  
  // Publish to MQTT
  if (client.publish(MQTT_TOPIC, json_string.c_str())) {
    Serial.println("Data published: " + json_string);
  } else {
    Serial.println("Failed to publish data");
  }
}

void publish_status(const char* status) {
  if (!client.connected()) {
    return;
  }
  
  StaticJsonDocument<STATUS_JSON_SIZE> doc;
  doc["scale_id"] = SCALE_ID;
  doc["status"] = status;
  doc["timestamp"] = millis();
  doc["ip_address"] = WiFi.localIP().toString();
  
  String json_string;
  serializeJson(doc, json_string);
  
  String status_topic = String(MQTT_TOPIC) + "/status";
  client.publish(status_topic.c_str(), json_string.c_str());
}

void handle_buttons() {
  // Tare button
  if (digitalRead(TARE_BUTTON_PIN) == LOW) {
    delay(DEBOUNCE_DELAY); // Debounce
    if (digitalRead(TARE_BUTTON_PIN) == LOW) {
      scale.tare();
      Serial.println("Scale tared");
      publish_status("tared");
      while (digitalRead(TARE_BUTTON_PIN) == LOW) {
        delay(BUTTON_POLL_DELAY);
      }
    }
  }
  
  // Calibration button (hold for specified time)
  if (digitalRead(CALIBRATION_BUTTON_PIN) == LOW) {
    unsigned long button_start = millis();
    while (digitalRead(CALIBRATION_BUTTON_PIN) == LOW && 
           (millis() - button_start) < BUTTON_HOLD_TIME) {
      delay(BUTTON_POLL_DELAY);
    }
    
    if ((millis() - button_start) >= BUTTON_HOLD_TIME) {
      calibrate_scale();
    }
  }
}

void calibrate_scale() {
  Serial.println("Starting calibration...");
  Serial.println("Remove all weight from scale and press tare button");
  
  // Wait for tare button
  while (digitalRead(TARE_BUTTON_PIN) == HIGH) {
    delay(CALIBRATION_WAIT_DELAY);
  }
  
  scale.tare();
  Serial.println("Scale tared. Place known weight and enter weight in Serial Monitor");
  
  // In a real implementation, you would read the known weight from serial
  // For now, we'll use a default calibration
  Serial.println("Using default calibration factor");
  publish_status("calibrated");
}
