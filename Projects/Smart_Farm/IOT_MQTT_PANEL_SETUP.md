# IoT MQTT Panel Configuration Guide

## Overview
IoT MQTT Panel is a mobile/desktop app that subscribes to MQTT topics and displays real-time sensor data in customizable dashboards.

## Prerequisites
✅ Mosquitto MQTT broker running on localhost:1883  
✅ Backend running and publishing to MQTT  
✅ Arduino sending data to backend API  
✅ IoT MQTT Panel app installed

---

## Getting IoT MQTT Panel App

### Option 1: Mobile (Android)
1. Open Google Play Store
2. Search: "IoT MQTT Panel"
3. Developer: "Niels Brouwers"
4. Install the app

### Option 2: Desktop/Web
- Project: https://github.com/TamaraAbells/IoT-MQTT-Panel
- Or use web version at: http://mqtt-panel.nbrouwers.nl

---

## Initial App Setup

### Step 1: Add Connection

1. Open IoT MQTT Panel
2. Tap **"+"** or **"Add"** button
3. Fill in connection details:

| Field | Value | Notes |
|-------|-------|-------|
| **Connection Name** | `SmartFarm-Local` | Any name you like |
| **Broker Address** | `192.168.1.100` | Your PC's local IP (or `localhost` if on same device) |
| **Port** | `1883` | Default MQTT port |
| **Username** | (leave blank) | Only if auth enabled |
| **Password** | (leave blank) | Only if auth enabled |
| **Client ID** | `iot-panel-smartfarm` | Unique identifier |
| **Keep Alive** | `60` | Default is fine |

4. Tap **"Save"** or **"Connect"**

**Finding Your PC's IP:**
```powershell
# Windows PowerShell
ipconfig

# Look for "IPv4 Address" under your WiFi adapter
# Example: 192.168.1.100
```

---

## Step 2: Create Dashboard

### Create New Panel
1. After connecting, tap **"+"** to create new panel
2. Name it: `SmartFarm Sensors`
3. Tap **"Add Item"**

---

## Step 3: Add Sensor Widgets

### Widget 1: Temperature Display

**Settings:**
- **Widget Type:** `Slider` or `Value` (display only)
- **Name:** `Sensor 001 - Temperature`
- **MQTT Topic:** `smartfarm/sensor/001/temperature`
- **Format:** `°C` (or decimal)
- **Min:** `20`
- **Max:** `40`
- **Update Interval:** `2000` (milliseconds)

**Result:** Displays live temperature in real-time

### Widget 2: Humidity Display

**Settings:**
- **Widget Type:** `Value` or `Gauge`
- **Name:** `Sensor 001 - Humidity`
- **MQTT Topic:** `smartfarm/sensor/001/humidity`
- **Format:** `%`
- **Min:** `0`
- **Max:** `100`

### Widget 3: Light Level

**Settings:**
- **Widget Type:** `Gauge`
- **Name:** `Sensor 001 - Light`
- **MQTT Topic:** `smartfarm/sensor/001/light_level`
- **Min:** `0`
- **Max:** `1000`

### Widget 4: Complete Sensor Data (JSON)

**Settings:**
- **Widget Type:** `Text Display` or `JSON Viewer`
- **Name:** `Sensor 001 - All Data`
- **MQTT Topic:** `smartfarm/sensor/001/all`
- **Display Format:** `JSON` or `Raw`

**Will display:**
```json
{
  "sensor_id": "001",
  "location": "Tondo II",
  "temperature": 33.45,
  "humidity": 65.0,
  "light_level": 850,
  "timestamp": "2026-05-05T12:34:56Z"
}
```

---

## Advanced: Monitor Multiple Sensors

### Using Wildcards

Instead of creating separate widgets for each sensor (001, 002, 003, etc.), use MQTT wildcards:

**Single Widget for All Temperatures:**
- **MQTT Topic:** `smartfarm/sensor/+/temperature`
- Shows latest value from ANY sensor that publishes

**Single Widget for All Humidity:**
- **MQTT Topic:** `smartfarm/sensor/+/humidity`

**All Data from All Sensors:**
- **MQTT Topic:** `smartfarm/sensor/#`
- Shows complete feed of all sensor data

---

## Step 4: Verify Data Flow

### Checklist
```
✓ Mosquitto broker running (port 1883)
✓ Backend running (http://localhost:3000)
✓ Arduino sending data via HTTP POST
✓ IoT Panel connected to MQTT broker
✓ Widgets added with correct topics
✓ Data updating in real-time in UI
```

### Troubleshooting Data Not Appearing

1. **Check MQTT connection status:**
   - Look for connection indicator (usually green circle)
   - If red/disconnected, verify broker address and port

2. **Verify backend is publishing:**
   ```powershell
   cd "C:\Program Files\Mosquitto"
   .\mosquitto_sub.exe -h 192.168.1.100 -t "smartfarm/sensor/#"
   # Should show incoming messages
   ```

3. **Check Arduino is sending:**
   - Open Arduino Serial Monitor (115200 baud)
   - Look for "[HTTP] Success (200)" messages

4. **Verify backend has MQTT module:**
   - Check backend logs: `[MQTT] Connected to broker`

---

## Dashboard Layout Examples

### Example 1: Basic 4-Widget Dashboard
```
┌─────────────────────────────┐
│ SmartFarm Sensors           │
├─────────┬───────┬───────────┤
│  Temp   │ Humid │  Light    │
│  33.4°C │  65%  │  850 lux  │
├─────────────────────────────┤
│  Full Data (JSON)           │
│  {...}                      │
└─────────────────────────────┘
```

### Example 2: Multi-Sensor Grid
```
┌──────────────┬──────────────┐
│ Sensor 001   │ Sensor 002   │
│ 33.4°C, 65%  │ 31.2°C, 72%  │
├──────────────┼──────────────┤
│ Sensor 003   │ Sensor 004   │
│ 28.9°C, 58%  │ 32.1°C, 68%  │
└──────────────┴──────────────┘
```

---

## Topics Summary Table

Use these exact topic names in your widgets:

| Sensor ID | Metric | Topic |
|-----------|--------|-------|
| 001 | Temp | `smartfarm/sensor/001/temperature` |
| 001 | Humidity | `smartfarm/sensor/001/humidity` |
| 001 | Light | `smartfarm/sensor/001/light_level` |
| 001 | All | `smartfarm/sensor/001/all` |
| ANY | Temp (all) | `smartfarm/sensor/+/temperature` |
| ANY | ALL | `smartfarm/sensor/#` |

---

## Next Steps
1. ✅ Install IoT MQTT Panel app
2. ✅ Add connection to MQTT broker
3. ✅ Create dashboard with widgets
4. ✅ Verify data is flowing
5. → Set up GitHub Pages frontend (optional next step)

---

## FAQ

**Q: Can I access IoT Panel remotely (outside my WiFi)?**
A: Yes, if you use a cloud MQTT broker (HiveMQ Cloud) instead of local Mosquitto

**Q: Can I trigger actions from IoT Panel?**
A: Yes, publish to MQTT topics that backend listens to (requires subscribing in backend)

**Q: How do I add more sensors?**
A: Just ensure Arduino sends sensor_id 002, 003, etc., and add new widgets with matching topics

**Q: Data not refreshing?**
A: Check QoS settings (use QoS 1), verify update interval (2000ms is good), check WiFi connection
