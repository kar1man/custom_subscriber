# Complete Setup & Testing Guide

## 🎯 Quick Overview

Your Smart Farm system now has three parts:

```
┌─────────────────┐         ┌──────────────────┐
│   Arduino       │         │  Custom Backend  │
│   (WiFi)        │────────▶│  (Node.js/API)   │
│   HTTP POST     │         │  /api/sensors    │
└─────────────────┘         └────────┬─────────┘
                                     │
                      ┌──────────────┴──────────────┐
                      │                             │
                    MQTT                         Database
                   Publish                      (PostgreSQL)
                      │
         ┌────────────┴────────────┐
         │                         │
    ┌──────────────┐         ┌──────────────┐
    │   Frontend   │         │  IoT MQTT    │
    │  (GitHub)    │         │   Panel App  │
    │  Dashboard   │         │  Monitoring  │
    └──────────────┘         └──────────────┘
```

---

## PART 1: MQTT Broker Setup ⚙️

### Step 1: Install Mosquitto
See [MQTT_BROKER_SETUP.md](./MQTT_BROKER_SETUP.md)

### Step 2: Verify Mosquitto is Running
```powershell
# Terminal 1: Start Mosquitto
cd "C:\Program Files\Mosquitto"
.\mosquitto.exe

# Expected output:
# 1694268345: mosquitto version 2.0.18 starting
# 1694268345: Opening ipv4 listen socket on port 1883.
```

---

## PART 2: Backend Setup 🔧

### Step 1: Install Dependencies
```bash
cd d:\Aljun Cerina\FCNG9\Projects\Smart_Farm\backend
npm install
```

### Step 2: Create .env File
Create file: `backend/.env`
```
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_farm_dev
NODE_ENV=development
MQTT_BROKER_URL=mqtt://localhost:1883
ENABLE_VALIDATION_LOG=false
```

### Step 3: Setup PostgreSQL Database
```bash
# Make sure PostgreSQL is running, then:
cd d:\Aljun Cerina\FCNG9\Projects\Smart_Farm\backend
psql -U postgres -d smart_farm_dev -f schema.sql
psql -U postgres -d smart_farm_dev -f seed.sql
```

### Step 4: Start Backend
```bash
# Terminal 2: Start Backend
cd d:\Aljun Cerina\FCNG9\Projects\Smart_Farm\backend
npm start

# Expected output:
# ╔════════════════════════════════════════════════════════╗
# ║  Smart Agriculture IoT Backend Server                 ║
# ║  Status:        ✓ Running                             ║
# ║  Server:        0.0.0.0:3000                          ║
# ║  [MQTT] ✓ Connected to broker                         ║
# ╚════════════════════════════════════════════════════════╝
```

### Step 5: Verify Backend is Working
```bash
# Terminal 3 (separate)
curl http://localhost:3000/api/health
# Should return JSON with status "healthy"
```

---

## PART 3: Arduino Setup 📡

### Step 1: Prepare Arduino IDE
1. Open Arduino IDE
2. Install library: `ArduinoHttpClient` (Sketch → Include Library → Manage Libraries)

### Step 2: Configure Sketch
Open: `custom_mqtt_node/SmartFarm_CustomBackend_Node001.ino`

Update these lines:
```cpp
// Line 20-21: Your WiFi
const char* WIFI_SSID = "YOUR_SSID";
const char* WIFI_PASS = "YOUR_PASSWORD";

// Line 26-27: Backend IP (find with ipconfig)
const char* BACKEND_SERVER = "192.168.1.100";  // Change this!
const uint16_t BACKEND_PORT = 3000;
```

### Step 3: Upload & Test
1. Connect Arduino via USB
2. Tools → Board: Arduino R4 WiFi
3. Tools → Port: COMX (your Arduino)
4. Upload sketch
5. Open Serial Monitor (115200 baud)

Expected output:
```
==================================
Smart Farm - Custom Backend Mode
==================================
[CHECK] LED self-test OK
[WIFI] Connecting to: YOUR_SSID
[WIFI] Connected! IP: 192.168.1.105
[HTTP] Sending POST to /api/sensors/data
{"sensor_id":"001","location":"Tondo II",...}
[HTTP] Success (201)
```

---

## PART 4: Verify Data Flow 🔄

### Check 1: Backend Receives Arduino Data
```bash
# Terminal 3
curl http://localhost:3000/api/sensors

# Should show:
# {
#   "sensors": [
#     {
#       "id": "001",
#       "online": true,
#       "latest": {
#         "temperature": 33.45,
#         "humidity": 65,
#         "light_level": 850
#       }
#     }
#   ]
# }
```

### Check 2: Backend Publishes to MQTT
```powershell
# Terminal 4: Subscribe to MQTT
cd "C:\Program Files\Mosquitto"
.\mosquitto_sub.exe -h localhost -t "smartfarm/sensor/#"

# Should show messages like:
# 33.45
# 65.0
# 850
# {"sensor_id":"001",...}
```

### Check 3: Verify Database Stores Data
```bash
# Terminal 5
psql -U postgres -d smart_farm_dev

# In psql prompt:
SELECT COUNT(*) FROM sensor_data;
# Should increment every 5 seconds

SELECT * FROM sensor_data ORDER BY time DESC LIMIT 5;
# Should show recent readings
```

---

## PART 5: IoT MQTT Panel Setup 📱

See [IOT_MQTT_PANEL_SETUP.md](./IOT_MQTT_PANEL_SETUP.md)

### Quick Setup:
1. Install IoT MQTT Panel app
2. Add connection:
   - Broker: `192.168.1.100` (your PC IP)
   - Port: `1883`
3. Create dashboard panel
4. Add widgets with topics:
   - `smartfarm/sensor/001/temperature`
   - `smartfarm/sensor/001/humidity`
   - `smartfarm/sensor/001/light_level`
   - `smartfarm/sensor/001/all`

---

## Complete Test Checklist

```
[ ] Terminal 1: Mosquitto running
    Output should show: "mosquitto version 2.0.18 starting"

[ ] Terminal 2: Backend running on port 3000
    Output should show: "Server running on 0.0.0.0:3000"

[ ] Arduino connected and uploading
    Serial Monitor shows: "[WIFI] Connected!"

[ ] Backend receives data
    GET http://localhost:3000/api/sensors shows data

[ ] MQTT broker receives data
    mosquitto_sub shows messages from smartfarm/sensor/+/temperature

[ ] IoT MQTT Panel connects
    Connection indicator shows green/connected

[ ] IoT Panel widgets show live data
    Temperature, humidity, light level updating
```

---

## Troubleshooting

| Issue | Symptom | Solution |
|-------|---------|----------|
| Arduino can't connect | Serial: "[WIFI] Connection timeout" | Check SSID/password, WiFi range |
| Backend won't start | Error: "Port 3000 in use" | Kill other processes on 3000: `netstat -ano \| find ":3000"` |
| No data in database | Empty sensor_data table | Check Arduino is sending, backend logs show POST |
| MQTT not working | "mosquitto: command not found" | Add Mosquitto to PATH or use full path |
| IoT Panel no connection | Red indicator | Check broker IP and port, firewall |
| No MQTT data in panel | Subscribing but no messages | Verify MQTT topics, check mosquitto_sub separately |

---

## What's Next?

✅ **Done:**
- Arduino sends data via HTTP
- Backend stores in PostgreSQL
- MQTT publishes for IoT Panel
- IoT Panel displays real-time data

📦 **Optional Enhancements:**
1. Host backend on cloud (Render, Railway)
2. Deploy frontend to GitHub Pages
3. Use cloud MQTT broker (HiveMQ) for remote access
4. Add database backup strategy
5. Set up analytics/graphs for historical data

---

## File Reference

```
Projects/Smart_Farm/
├── custom_mqtt_node/
│   ├── SmartFarm_CustomBackend_Node001.ino   ← Use this Arduino sketch
│   └── README.md
├── backend/
│   ├── src/
│   │   ├── index.js                           ← Now has MQTT support
│   │   ├── mqtt.js                            ← NEW: MQTT publisher
│   │   └── ...
│   ├── .env                                   ← Create this with settings
│   └── package.json
├── MQTT_BROKER_SETUP.md                       ← Setup Mosquitto
├── IOT_MQTT_PANEL_SETUP.md                    ← Configure IoT Panel
└── COMPLETE_SETUP_AND_TESTING.md              ← You are here
```
