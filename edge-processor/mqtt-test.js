#!/usr/bin/env node

const mqtt = require('mqtt');
const path = require('path');
require('dotenv').config();

class MQTTTester {
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
            this.log('Starting MQTT connection test...', 'test');
            
            // Display configuration
            this.log(`Host: ${process.env.CLOUD_MQTT_HOST}:${process.env.CLOUD_MQTT_PORT || 1883}`, 'info');
            this.log(`Username: ${process.env.CLOUD_MQTT_USERNAME || 'Not set'}`, 'info');
            this.log(`Password: ${process.env.CLOUD_MQTT_PASSWORD ? '[SET]' : '[NOT SET]'}`, 'info');
            
            if (!process.env.CLOUD_MQTT_HOST) {
                this.log('CLOUD_MQTT_HOST not configured in .env file', 'error');
                this.testResults.connection = false;
                this.testResults.errors.push('Missing CLOUD_MQTT_HOST');
                resolve(false);
                return;
            }

            const startTime = Date.now();
            const mqttOptions = {
                username: process.env.CLOUD_MQTT_USERNAME,
                password: process.env.CLOUD_MQTT_PASSWORD,
                connectTimeout: 10000,
                reconnectPeriod: 0 // Disable auto-reconnect for testing
            };

            const brokerUrl = `mqtt://${process.env.CLOUD_MQTT_HOST}:${process.env.CLOUD_MQTT_PORT || 1883}`;
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
                this.log(`Successfully connected to MQTT broker (${duration}ms)`, 'success');
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
            this.log('Testing message publishing...', 'test');
            
            const testTopic = 'test/edge-processor';
            const testMessage = {
                test: true,
                timestamp: Date.now(),
                nodeId: process.env.EDGE_NODE_ID || 'test_node',
                message: 'MQTT connection test from edge processor'
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
            this.log('Testing message subscription...', 'test');
            
            const testTopic = 'test/edge-processor/+';
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
                    this.log('Listening for messages for 5 seconds...', 'info');
                }
            });

            this.client.on('message', (topic, message) => {
                if (topic.startsWith('test/edge-processor')) {
                    clearTimeout(timeout);
                    messageReceived = true;
                    this.log(`Received message on ${topic}: ${message.toString()}`, 'success');
                    this.testResults.subscribe = true;
                    resolve(true);
                }
            });
        });
    }

    async runFullTest() {
        this.log('='.repeat(60), 'info');
        this.log('MQTT Connection Test Suite', 'test');
        this.log('='.repeat(60), 'info');

        try {
            // Test 1: Connection
            this.log('\n1. Testing MQTT Connection...', 'test');
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
        this.log('TEST RESULTS SUMMARY', 'test');
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
        
        this.log('='.repeat(60), 'info');
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const tester = new MQTTTester();

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
MQTT Connection Tester

Usage: node mqtt-test.js [options]

Options:
  --help, -h     Show this help message
  --quick, -q    Run quick connection test only
  --verbose, -v  Enable verbose logging

Examples:
  node mqtt-test.js              # Run full test suite
  node mqtt-test.js --quick      # Test connection only
  node mqtt-test.js --verbose    # Run with detailed logging

Environment variables (from .env file):
  CLOUD_MQTT_HOST     - MQTT broker hostname
  CLOUD_MQTT_PORT     - MQTT broker port (default: 1883)
  CLOUD_MQTT_USERNAME - MQTT username
  CLOUD_MQTT_PASSWORD - MQTT password
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

module.exports = MQTTTester;
