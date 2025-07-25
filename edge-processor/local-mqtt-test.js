#!/usr/bin/env node

const mqtt = require('mqtt');
const path = require('path');
require('dotenv').config();

class LocalMQTTTester {
    constructor() {
        this.client = null;
        this.connected = false;
        this.testResults = {
            connection: null,
            publish: null,
            subscribe: null,
            errors: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'test': '🧪'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async testConnection() {
        return new Promise((resolve) => {
            this.log('Starting local MQTT broker connection test...', 'test');
            
            // Display configuration
            this.log(`Host: ${process.env.LOCAL_MQTT_HOST}:${process.env.LOCAL_MQTT_PORT || 1883}`, 'info');
            this.log(`Username: ${process.env.LOCAL_MQTT_USERNAME || 'Not set'}`, 'info');
            this.log(`Password: ${process.env.LOCAL_MQTT_PASSWORD ? '[SET]' : '[NOT SET]'}`, 'info');
            
            if (!process.env.LOCAL_MQTT_HOST) {
                this.log('LOCAL_MQTT_HOST not configured in .env file', 'error');
                this.testResults.connection = false;
                this.testResults.errors.push('Missing LOCAL_MQTT_HOST');
                resolve(false);
                return;
            }

            const startTime = Date.now();
            const mqttOptions = {
                connectTimeout: 10000,
                reconnectPeriod: 0 // Disable auto-reconnect for testing
            };

            // Add authentication if provided
            if (process.env.LOCAL_MQTT_USERNAME && process.env.LOCAL_MQTT_PASSWORD) {
                mqttOptions.username = process.env.LOCAL_MQTT_USERNAME;
                mqttOptions.password = process.env.LOCAL_MQTT_PASSWORD;
            }

            const brokerUrl = `mqtt://${process.env.LOCAL_MQTT_HOST}:${process.env.LOCAL_MQTT_PORT || 1883}`;
            this.log(`Attempting connection to: ${brokerUrl}`, 'info');

            this.client = mqtt.connect(brokerUrl, mqttOptions);

            // Set timeout for connection test
            const timeout = setTimeout(() => {
                this.log('Connection timeout (10 seconds)', 'error');
                this.testResults.connection = false;
                this.testResults.errors.push('Connection timeout');
                if (this.client) {
                    this.client.end(true);
                }
                resolve(false);
            }, 10000);

            this.client.on('connect', () => {
                clearTimeout(timeout);
                const duration = Date.now() - startTime;
                this.log(`Successfully connected to local MQTT broker (${duration}ms)`, 'success');
                this.connected = true;
                this.testResults.connection = true;
                resolve(true);
            });

            this.client.on('error', (error) => {
                clearTimeout(timeout);
                this.log(`Connection error: ${error.message}`, 'error');
                this.testResults.connection = false;
                this.testResults.errors.push(`Connection error: ${error.message}`);
                resolve(false);
            });

            this.client.on('offline', () => {
                this.log('Client went offline', 'warning');
            });

            this.client.on('disconnect', () => {
                this.log('Client disconnected', 'info');
                this.connected = false;
            });
        });
    }

    async testPublish() {
        if (!this.connected) {
            this.log('Cannot test publish - not connected', 'error');
            this.testResults.publish = false;
            return false;
        }

        return new Promise((resolve) => {
            this.log('Testing ESP32 scale data publishing...', 'test');
            
            const testTopic = 'inventory/scale/001';
            const testMessage = {
                scale_id: "SCALE_001",
                location: "WAREHOUSE_A",
                item_type: "COMPONENTS",
                weight_kg: 2.5,
                item_count: 5,
                item_weight: 0.5,
                timestamp: Date.now(),
                status: "active"
            };

            const startTime = Date.now();
            
            this.client.publish(testTopic, JSON.stringify(testMessage), { qos: 1 }, (error) => {
                const duration = Date.now() - startTime;
                
                if (error) {
                    this.log(`Publish failed: ${error.message}`, 'error');
                    this.testResults.publish = false;
                    this.testResults.errors.push(`Publish error: ${error.message}`);
                    resolve(false);
                } else {
                    this.log(`Successfully published to ${testTopic} (${duration}ms)`, 'success');
                    this.log(`Message: ${JSON.stringify(testMessage)}`, 'info');
                    this.testResults.publish = true;
                    resolve(true);
                }
            });
        });
    }

    async testSubscribe() {
        if (!this.connected) {
            this.log('Cannot test subscribe - not connected', 'error');
            this.testResults.subscribe = false;
            return false;
        }

        return new Promise((resolve) => {
            this.log('Testing ESP32 topic subscription...', 'test');
            
            const testTopic = 'inventory/scale/+';
            let messageReceived = false;
            
            // Set timeout for subscription test
            const timeout = setTimeout(() => {
                if (!messageReceived) {
                    this.log('No messages received within 5 seconds (this may be normal)', 'warning');
                    this.testResults.subscribe = true; // Subscription itself worked
                    resolve(true);
                }
            }, 5000);

            this.client.subscribe(testTopic, { qos: 1 }, (error) => {
                if (error) {
                    clearTimeout(timeout);
                    this.log(`Subscribe failed: ${error.message}`, 'error');
                    this.testResults.subscribe = false;
                    this.testResults.errors.push(`Subscribe error: ${error.message}`);
                    resolve(false);
                } else {
                    this.log(`Successfully subscribed to ${testTopic}`, 'success');
                    this.log('Listening for ESP32 messages for 5 seconds...', 'info');
                }
            });

            this.client.on('message', (topic, message) => {
                if (topic.startsWith('inventory/scale/')) {
                    clearTimeout(timeout);
                    messageReceived = true;
                    this.log(`Received ESP32 message on ${topic}: ${message.toString()}`, 'success');
                    this.testResults.subscribe = true;
                    resolve(true);
                }
            });
        });
    }

    async testESP32Simulation() {
        if (!this.connected) {
            this.log('Cannot simulate ESP32 - not connected', 'error');
            return false;
        }

        return new Promise((resolve) => {
            this.log('Simulating ESP32 scale data...', 'test');
            
            // Simulate multiple ESP32 messages
            const scaleData = [
                {
                    scale_id: "SCALE_001",
                    location: "WAREHOUSE_A",
                    item_type: "COMPONENTS",
                    weight_kg: 1.5,
                    item_count: 3,
                    item_weight: 0.5,
                    timestamp: Date.now(),
                    status: "active"
                },
                {
                    scale_id: "SCALE_001",
                    location: "WAREHOUSE_A",
                    item_type: "COMPONENTS",
                    weight_kg: 2.0,
                    item_count: 4,
                    item_weight: 0.5,
                    timestamp: Date.now() + 1000,
                    status: "active"
                }
            ];

            let publishCount = 0;
            const publishNext = () => {
                if (publishCount >= scaleData.length) {
                    this.log(`Successfully simulated ${publishCount} ESP32 messages`, 'success');
                    resolve(true);
                    return;
                }

                const data = scaleData[publishCount];
                const topic = `inventory/scale/${data.scale_id.toLowerCase().replace('_', '')}`;
                
                this.client.publish(topic, JSON.stringify(data), { qos: 1 }, (error) => {
                    if (error) {
                        this.log(`Failed to publish message ${publishCount + 1}: ${error.message}`, 'error');
                        resolve(false);
                    } else {
                        this.log(`Published ESP32 message ${publishCount + 1}/${scaleData.length}`, 'success');
                        publishCount++;
                        setTimeout(publishNext, 1000); // Wait 1 second between messages
                    }
                });
            };

            publishNext();
        });
    }

    async runFullTest() {
        this.log('='.repeat(60), 'info');
        this.log('Local MQTT Broker Test Suite', 'test');
        this.log('='.repeat(60), 'info');

        try {
            // Test 1: Connection
            this.log('\n1. Testing Local MQTT Connection...', 'test');
            const connectionSuccess = await this.testConnection();
            
            if (!connectionSuccess) {
                this.log('Connection failed - skipping other tests', 'error');
                this.printResults();
                return;
            }

            // Test 2: Publishing
            this.log('\n2. Testing Message Publishing...', 'test');
            await this.testPublish();

            // Test 3: Subscription
            this.log('\n3. Testing Message Subscription...', 'test');
            await this.testSubscribe();

            // Test 4: ESP32 Simulation
            this.log('\n4. Simulating ESP32 Scale Data...', 'test');
            await this.testESP32Simulation();

        } catch (error) {
            this.log(`Unexpected error: ${error.message}`, 'error');
            this.testResults.errors.push(`Unexpected error: ${error.message}`);
        } finally {
            // Cleanup
            if (this.client) {
                this.client.end();
            }
            
            this.printResults();
        }
    }

    printResults() {
        this.log('\n' + '='.repeat(60), 'info');
        this.log('LOCAL MQTT TEST RESULTS SUMMARY', 'test');
        this.log('='.repeat(60), 'info');
        
        this.log(`Connection Test: ${this.testResults.connection ? 'PASS' : 'FAIL'}`, 
                 this.testResults.connection ? 'success' : 'error');
        this.log(`Publish Test: ${this.testResults.publish ? 'PASS' : 'FAIL'}`, 
                 this.testResults.publish ? 'success' : 'error');
        this.log(`Subscribe Test: ${this.testResults.subscribe ? 'PASS' : 'FAIL'}`, 
                 this.testResults.subscribe ? 'success' : 'error');

        if (this.testResults.errors.length > 0) {
            this.log('\nErrors encountered:', 'error');
            this.testResults.errors.forEach(error => {
                this.log(`  - ${error}`, 'error');
            });
        }

        const allPassed = this.testResults.connection && 
                         this.testResults.publish && 
                         this.testResults.subscribe;
        
        this.log(`\nOverall Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`, 
                 allPassed ? 'success' : 'error');

        if (allPassed) {
            this.log('\n🎉 Your local MQTT broker is ready for ESP32 connections!', 'success');
            this.log('Next steps:', 'info');
            this.log('1. Run the Windows setup script to install Mosquitto', 'info');
            this.log('2. Update ESP32 secrets.h with the broker credentials', 'info');
            this.log('3. Upload the ESP32 firmware and test the connection', 'info');
        } else {
            this.log('\n❌ Local MQTT broker setup needs attention', 'error');
            this.log('Please check the errors above and:', 'info');
            this.log('1. Ensure Mosquitto is installed and running', 'info');
            this.log('2. Verify the credentials in your .env file', 'info');
            this.log('3. Check firewall settings if needed', 'info');
        }
        
        this.log('='.repeat(60), 'info');
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const tester = new LocalMQTTTester();

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Local MQTT Broker Tester

Usage: node local-mqtt-test.js [options]

Options:
  --help, -h     Show this help message
  --quick, -q    Run quick connection test only
  --simulate, -s Run ESP32 simulation only

Examples:
  node local-mqtt-test.js              # Run full test suite
  node local-mqtt-test.js --quick      # Test connection only
  node local-mqtt-test.js --simulate   # Simulate ESP32 data

Environment variables (from .env file):
  LOCAL_MQTT_HOST     - Local MQTT broker hostname (usually localhost)
  LOCAL_MQTT_PORT     - Local MQTT broker port (default: 1883)
  LOCAL_MQTT_USERNAME - Local MQTT username (esp32_user or edge_processor)
  LOCAL_MQTT_PASSWORD - Local MQTT password
        `);
        process.exit(0);
    }

    if (args.includes('--quick') || args.includes('-q')) {
        // Quick test - connection only
        tester.testConnection().then(success => {
            if (success) {
                tester.log('Quick connection test: PASSED', 'success');
                tester.client.end();
            } else {
                tester.log('Quick connection test: FAILED', 'error');
            }
            process.exit(success ? 0 : 1);
        });
    } else if (args.includes('--simulate') || args.includes('-s')) {
        // ESP32 simulation only
        tester.testConnection().then(success => {
            if (success) {
                return tester.testESP32Simulation();
            } else {
                return false;
            }
        }).then(success => {
            tester.client.end();
            process.exit(success ? 0 : 1);
        });
    } else {
        // Full test suite
        tester.runFullTest().then(() => {
            const success = tester.testResults.connection && 
                           tester.testResults.publish && 
                           tester.testResults.subscribe;
            process.exit(success ? 0 : 1);
        });
    }
}

module.exports = LocalMQTTTester;
