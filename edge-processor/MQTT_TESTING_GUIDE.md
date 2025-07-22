# MQTT Connection Testing Guide

This guide explains how to manually test the MQTT connection to your cloud server using the provided testing tools.

## Available Testing Tools

### 1. Node.js Test Script (`mqtt-test.js`)
A comprehensive testing script that performs connection, publishing, and subscription tests.

### 2. Windows Batch Script (`test-mqtt.bat`)
A simple double-click solution for Windows users.

## Quick Start

### Option 1: Using the Batch Script (Windows)
1. Navigate to the `edge-processor` folder
2. Double-click `test-mqtt.bat`
3. The test will run automatically and show results

### Option 2: Using Node.js Directly
```bash
cd edge-processor
node mqtt-test.js
```

## Test Options

### Full Test Suite (Default)
```bash
node mqtt-test.js
```
Runs all tests:
- Connection test
- Message publishing test
- Message subscription test

### Quick Connection Test
```bash
node mqtt-test.js --quick
```
Only tests the MQTT connection (faster for basic connectivity checks).

### Help
```bash
node mqtt-test.js --help
```
Shows all available options and usage information.

## What the Tests Do

### 1. Connection Test
- Reads MQTT configuration from `.env` file
- Attempts to connect to the MQTT broker
- Reports connection time and success/failure
- Shows detailed error messages if connection fails

### 2. Publishing Test
- Publishes a test message to `test/edge-processor` topic
- Verifies the publish operation succeeds
- Shows the published message content

### 3. Subscription Test
- Subscribes to `test/edge-processor/+` topic pattern
- Listens for incoming messages for 5 seconds
- Reports if subscription was successful

## Understanding Test Results

### Success Output Example
```
✅ [timestamp] Successfully connected to MQTT broker (614ms)
✅ [timestamp] Successfully published to test/edge-processor (338ms)
✅ [timestamp] Successfully subscribed to test/edge-processor/+

TEST RESULTS SUMMARY
Connection Test: PASS
Publish Test: PASS
Subscribe Test: PASS
Overall Result: ALL TESTS PASSED
```

### Failure Output Example
```
❌ [timestamp] Connection error: Connection refused: Not authorized

TEST RESULTS SUMMARY
Connection Test: FAIL
Publish Test: FAIL
Subscribe Test: FAIL

Errors encountered:
  - Connection error: Connection refused: Not authorized
Overall Result: SOME TESTS FAILED
```

## Common Issues and Solutions

### 1. "Connection refused: Not authorized"
**Problem**: Invalid MQTT credentials
**Solution**: 
- Check your `.env` file has correct `CLOUD_MQTT_USERNAME` and `CLOUD_MQTT_PASSWORD`
- Verify credentials with your cloud server administrator

### 2. "Connection timeout"
**Problem**: Cannot reach the MQTT broker
**Solution**:
- Check `CLOUD_MQTT_HOST` and `CLOUD_MQTT_PORT` in `.env` file
- Verify network connectivity: `ping 188.166.200.18`
- Check if firewall is blocking the connection

### 3. "CLOUD_MQTT_HOST not configured"
**Problem**: Missing configuration
**Solution**: 
- Ensure `.env` file exists in the `edge-processor` directory
- Add the required MQTT configuration variables

### 4. "Cannot find module"
**Problem**: Running from wrong directory
**Solution**: 
- Make sure you're in the `edge-processor` directory
- Run `cd edge-processor` before running the test

## Configuration Variables

The test script reads these variables from your `.env` file:

| Variable | Description | Example |
|----------|-------------|---------|
| `CLOUD_MQTT_HOST` | MQTT broker hostname | `188.166.200.18` |
| `CLOUD_MQTT_PORT` | MQTT broker port | `1883` |
| `CLOUD_MQTT_USERNAME` | MQTT username | `cedalo` |
| `CLOUD_MQTT_PASSWORD` | MQTT password | `your_password` |
| `EDGE_NODE_ID` | Edge node identifier | `edge_001` |

## Testing Scenarios

### Scenario 1: Initial Setup Verification
Run the full test suite to verify your MQTT configuration is working:
```bash
node mqtt-test.js
```

### Scenario 2: Network Connectivity Check
Use the quick test to verify basic connectivity:
```bash
node mqtt-test.js --quick
```

### Scenario 3: Troubleshooting Connection Issues
1. Run the full test to see detailed error messages
2. Check the specific error in the results summary
3. Follow the troubleshooting steps for that error type

### Scenario 4: Testing After Configuration Changes
After updating credentials or server settings:
1. Update your `.env` file
2. Run the full test suite to verify all functionality

## Integration with Main Application

The test script uses the same MQTT library and configuration as the main edge processor application. If the tests pass, the main application should also be able to connect successfully.

## Automated Testing

You can use the test script in automated scenarios:
- Exit code 0 = all tests passed
- Exit code 1 = some tests failed

Example in a batch script:
```batch
node mqtt-test.js --quick
if %errorlevel% equ 0 (
    echo Connection test passed
) else (
    echo Connection test failed
)
```

## Security Notes

- The test script shows `[SET]` instead of the actual password for security
- Test messages are published to `test/` topics to avoid interfering with production data
- The script automatically cleans up connections after testing

## Support

If you encounter issues not covered in this guide:
1. Check the detailed error messages in the test output
2. Verify your network connectivity to the MQTT broker
3. Confirm your credentials are correct
4. Review the main application logs for additional context

---

**Last Updated**: January 2025
**Version**: 1.0
