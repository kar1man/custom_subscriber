# Custom Backend Arduino Node Setup

## Overview
This Arduino sketch sends sensor data directly to your custom backend API via HTTP POST, instead of using Adafruit IO.

## Requirements

### Hardware
- Arduino R4 WiFi
- WiFi connection
- LED on pin 4 (yellow)

### Software
1. **Arduino IDE** with R4 WiFi board support
2. **Libraries needed:**
   - `WiFiS3.h` (built-in with Arduino R4)
   - `ArduinoHttpClient.h` (install via Library Manager)

### Installation Steps

#### 1. Install ArduinoHttpClient Library
```
Arduino IDE → Sketch → Include Library → Manage Libraries
Search: "ArduinoHttpClient" by Arduino
Click Install
```

#### 2. Update WiFi Credentials
In `SmartFarm_CustomBackend_Node001.ino`, modify:
```cpp
const char* WIFI_SSID = "YOUR_SSID";
const char* WIFI_PASS = "YOUR_PASSWORD";
```

#### 3. Update Backend Server Address
```cpp
const char* BACKEND_SERVER = "192.168.1.100";  // Your backend IP
const uint16_t BACKEND_PORT = 3000;
```

**Finding your backend IP:**
- Windows: `ipconfig` → Find "IPv4 Address"
- macOS/Linux: `ifconfig` or `hostname -I`

#### 4. Upload & Test

## How It Works

### Data Flow
```
Arduino (every 5 seconds)
    ↓
HTTP POST to Backend
    ↓
/api/sensors/data endpoint
    ↓
PostgreSQL Database
    ↓
Frontend Dashboard displays data
```

### Payload Format
```json
{
  "sensor_id": "001",
  "location": "Tondo II",
  "temperature": 33.45,
  "humidity": 65.0,
  "light_level": 850,
  "is_daytime": true,
  "timestamp": "2026-05-05T12:34:56Z"
}
```

### LED Indicators
- **Blink on startup:** Self-test OK
- **Blink on POST success:** Data sent successfully
- **No blink on failure:** Check serial output for errors

### Serial Output (115200 baud)
```
[WIFI] Connecting to: PLDTHOMEFIBRAdWa4
[WIFI] Connected! IP: 192.168.1.105
[HTTP] Sending POST to /api/sensors/data
{"sensor_id":"001","location":"Tondo II",...}
[HTTP] Success (201)
```

## Multiple Nodes
To run multiple Arduino nodes:
1. Create copies in separate subfolders: `custom_mqtt_node_002/`, `custom_mqtt_node_003/`, etc.
2. Change `SENSOR_ID` to "002", "003", etc.
3. Modify `LOCATION_NAME` and simulate different locations
4. Upload to each Arduino board

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Backend is offline` | Check IP address, ensure backend is running |
| `HTTP Failed (0)` | WiFi connection issue, check SSID/password |
| `HTTP Failed (404)` | Backend endpoint not found, verify `/api/sensors/data` exists |
| No serial output | Check baud rate (115200), verify USB cable |

## Next Steps
1. ✅ Backend needs MQTT publish capability (for IoT Panel)
2. ✅ Frontend repo setup for GitHub Pages
3. ✅ IoT MQTT Panel configuration
