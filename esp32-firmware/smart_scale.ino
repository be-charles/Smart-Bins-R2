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
#include <Preferences.h>

// Include configuration files
#include "config.h"
#include "secrets.h"

// Hardware Configuration
#define HX711_DOUT_PIN  4
#define HX711_SCK_PIN   5
#define CALIBRATION_BUTTON_PIN 12
#define TARE_BUTTON_PIN 3

// Global Objects
HX711 scale;
WiFiClient espClient;
PubSubClient client(espClient);
Preferences preferences;

// Variables
float current_weight = 0.0;
float previous_weight = 0.0;
int item_count = 0;
unsigned long last_reading = 0;
unsigned long last_mqtt_attempt = 0;
bool calibration_in_progress = false;
unsigned long calibration_start_time = 0;
bool calibration_valid = false;
float stored_calibration_factor = CALIBRATION_FACTOR;

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  Serial.println("Smart Scale Starting...");
  
  // Initialize pins
  pinMode(CALIBRATION_BUTTON_PIN, INPUT_PULLUP);
  pinMode(TARE_BUTTON_PIN, INPUT_PULLUP);
  
  // Initialize preferences
  preferences.begin("scale", false);
  
  // Load calibration status
  load_calibration_status();
  
  // Initialize HX711
  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  scale.set_scale(stored_calibration_factor);
  scale.tare(); // Reset scale to 0
  
  Serial.println("Scale initialized and tared");
  
  // Display calibration status
  display_calibration_status();
  
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
  
  // Try connection with authentication if credentials are defined
  bool connected = false;
  
  #ifdef MQTT_USERNAME
    Serial.print(" (with auth)...");
    connected = client.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD);
  #else
    Serial.print(" (anonymous)...");
    connected = client.connect(MQTT_CLIENT_ID);
  #endif
  
  if (connected) {
    Serial.println("connected");
    
    // Subscribe to command topic
    String command_topic = String(MQTT_TOPIC) + "/commands";
    client.subscribe(command_topic.c_str());
    
    // Send online status
    publish_status("online");
    
  } else {
    Serial.print("failed, rc=");
    Serial.print(client.state());
    Serial.print(" (");
    
    // Print human-readable error codes
    switch(client.state()) {
      case -4: Serial.print("MQTT_CONNECTION_TIMEOUT"); break;
      case -3: Serial.print("MQTT_CONNECTION_LOST"); break;
      case -2: Serial.print("MQTT_CONNECT_FAILED"); break;
      case -1: Serial.print("MQTT_DISCONNECTED"); break;
      case 0: Serial.print("MQTT_CONNECTED"); break;
      case 1: Serial.print("MQTT_CONNECT_BAD_PROTOCOL"); break;
      case 2: Serial.print("MQTT_CONNECT_BAD_CLIENT_ID"); break;
      case 3: Serial.print("MQTT_CONNECT_UNAVAILABLE"); break;
      case 4: Serial.print("MQTT_CONNECT_BAD_CREDENTIALS"); break;
      case 5: Serial.print("MQTT_CONNECT_UNAUTHORIZED"); break;
      default: Serial.print("UNKNOWN_ERROR"); break;
    }
    
    Serial.println(") try again in 5 seconds");
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
  // Skip button handling if calibration is in progress
  if (calibration_in_progress) {
    return;
  }
  
  // Tare button - short press for tare, long press for recalibration
  if (digitalRead(TARE_BUTTON_PIN) == LOW) {
    delay(DEBOUNCE_DELAY); // Debounce
    if (digitalRead(TARE_BUTTON_PIN) == LOW) {
      unsigned long button_start = millis();
      
      // Wait to see if it's a long press
      while (digitalRead(TARE_BUTTON_PIN) == LOW && 
             (millis() - button_start) < BUTTON_HOLD_TIME) {
        delay(BUTTON_POLL_DELAY);
      }
      
      if ((millis() - button_start) >= BUTTON_HOLD_TIME) {
        // Long press - force recalibration
        Serial.println("🔄 Long press detected - forcing recalibration");
        reset_calibration_status();
        calibrate_scale();
      } else {
        // Short press - normal tare
        scale.tare();
        Serial.println("Scale tared");
        publish_status("tared");
      }
      
      // Wait for button release
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
  // Prevent re-entry during calibration
  if (calibration_in_progress) {
    Serial.println("Calibration already in progress, ignoring request");
    return;
  }
  
  calibration_in_progress = true;
  calibration_start_time = millis();
  
  Serial.println("=== CALIBRATION MODE STARTED ===");
  Serial.print("Step 1: Remove all weight from scale and press tare button");
  publish_status("calibrating");
  
  // Wait for tare button with timeout
  unsigned long tare_wait_start = millis();
  const unsigned long TARE_TIMEOUT = 30000; // 30 seconds timeout
  
  while (digitalRead(TARE_BUTTON_PIN) == HIGH) {
    delay(CALIBRATION_WAIT_DELAY);
    
    // Check for timeout
    if (millis() - tare_wait_start > TARE_TIMEOUT) {
      Serial.println("Calibration timeout - no tare button pressed");
      Serial.println("Calibration cancelled");
      calibration_in_progress = false;
      publish_status("calibration_timeout");
      return;
    }
    
    // Allow MQTT and WiFi to continue working
    if (!client.connected()) {
      reconnect_mqtt();
    }
    client.loop();
  }
  
  // Debounce tare button
  delay(DEBOUNCE_DELAY);
  if (digitalRead(TARE_BUTTON_PIN) == HIGH) {
    // False trigger, restart wait
    Serial.println("False tare trigger, continue waiting...");
    return; // This will exit and calibration_in_progress will remain true
  }
  
  // Tare the scale
  scale.tare();
  Serial.println("✓ Scale tared successfully");
  
  // Wait for tare button release
  while (digitalRead(TARE_BUTTON_PIN) == LOW) {
    delay(BUTTON_POLL_DELAY);
  }
  
  Serial.println("Step 2: Place calibration weight on scale");
  Serial.print("Place exactly ");
  Serial.print(CALIBRATION_KNOWN_WEIGHT);
  Serial.println(" kg on the scale");
  Serial.println("Then press the calibration button again to complete calibration");
  
  // Wait for calibration button press to complete calibration
  unsigned long calibration_wait_start = millis();
  const unsigned long CALIBRATION_TIMEOUT = 60000; // 60 seconds timeout
  
  while (digitalRead(CALIBRATION_BUTTON_PIN) == HIGH) {
    delay(CALIBRATION_WAIT_DELAY);
    
    // Check for timeout
    if (millis() - calibration_wait_start > CALIBRATION_TIMEOUT) {
      Serial.println("Calibration timeout - no calibration button pressed");
      Serial.println("Calibration cancelled");
      calibration_in_progress = false;
      publish_status("calibration_timeout");
      return;
    }
    
    // Allow MQTT and WiFi to continue working
    if (!client.connected()) {
      reconnect_mqtt();
    }
    client.loop();
  }
  
  // Debounce calibration button
  delay(DEBOUNCE_DELAY);
  if (digitalRead(CALIBRATION_BUTTON_PIN) == HIGH) {
    // False trigger, continue waiting
    Serial.println("False calibration trigger, continue waiting...");
    return; // This will exit and calibration_in_progress will remain true
  }
  
  // Wait for button release
  while (digitalRead(CALIBRATION_BUTTON_PIN) == LOW) {
    delay(BUTTON_POLL_DELAY);
  }
  
  // Calculate new calibration factor using known weight
  Serial.println("✓ Calculating calibration factor...");
  long raw_reading = scale.get_value(10); // Average of 10 readings
  
  if (raw_reading != 0) {
    float new_calibration_factor = raw_reading / CALIBRATION_KNOWN_WEIGHT;
    scale.set_scale(new_calibration_factor);
    
    Serial.print("Raw reading: ");
    Serial.println(raw_reading);
    Serial.print("Known weight: ");
    Serial.print(CALIBRATION_KNOWN_WEIGHT);
    Serial.println(" kg");
    Serial.print("New calibration factor: ");
    Serial.println(new_calibration_factor);
    Serial.println("✓ Calibration completed successfully");
  } else {
    Serial.println("Error: No weight detected on scale");
    Serial.println("Make sure the calibration weight is properly placed");
    Serial.println("Using previous calibration factor");
  }
  
  // Finalize calibration
  Serial.println("=== CALIBRATION COMPLETED ===");
  Serial.println("Remove calibration weight and resume normal operation");
  
  // Reset calibration state
  calibration_in_progress = false;
  publish_status("calibrated");
  
  // Store successful calibration
  if (raw_reading != 0) {
    save_calibration_status(new_calibration_factor);
  }
  
  // Brief delay before resuming normal operation
  delay(2000);
}

// Load calibration status from preferences
void load_calibration_status() {
  calibration_valid = preferences.getBool("cal_valid", false);
  stored_calibration_factor = preferences.getFloat("cal_factor", CALIBRATION_FACTOR);
  
  Serial.print("Loaded calibration status: ");
  Serial.println(calibration_valid ? "VALID" : "INVALID");
  Serial.print("Stored calibration factor: ");
  Serial.println(stored_calibration_factor);
}

// Save calibration status to preferences
void save_calibration_status(float calibration_factor) {
  preferences.putBool("cal_valid", true);
  preferences.putFloat("cal_factor", calibration_factor);
  preferences.putULong("cal_timestamp", millis());
  
  calibration_valid = true;
  stored_calibration_factor = calibration_factor;
  
  Serial.println("✓ Calibration status saved to memory");
}

// Display current calibration status
void display_calibration_status() {
  Serial.println("=== CALIBRATION STATUS ===");
  if (calibration_valid) {
    Serial.println("Status: CALIBRATED");
    Serial.print("Calibration factor: ");
    Serial.println(stored_calibration_factor);
    unsigned long cal_time = preferences.getULong("cal_timestamp", 0);
    Serial.print("Last calibrated: ");
    Serial.print(cal_time);
    Serial.println(" ms ago");
  } else {
    Serial.println("Status: NEEDS CALIBRATION");
    Serial.println("Using default calibration factor from config.h");
    Serial.println("⚠️  Scale may not be accurate until properly calibrated");
    Serial.println("Hold calibration button (pin 12) for 3 seconds to calibrate");
    Serial.println("Or hold tare button (pin 3) for 3 seconds to force recalibration");
  }
  Serial.println("========================");
}

// Reset calibration status (for testing/debugging)
void reset_calibration_status() {
  preferences.putBool("cal_valid", false);
  preferences.remove("cal_factor");
  preferences.remove("cal_timestamp");
  
  calibration_valid = false;
  stored_calibration_factor = CALIBRATION_FACTOR;
  
  Serial.println("⚠️  Calibration status reset - scale needs recalibration");
}
