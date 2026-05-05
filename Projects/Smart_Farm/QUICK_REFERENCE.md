# ⚡ Quick Reference Card

## Setup Checklist (Print This!)

### Terminal 1: MQTT Broker
```bash
cd "C:\Program Files\Mosquitto"
mosquitto.exe
# ✓ Port 1883 listening
```

### Terminal 2: Backend
```bash
cd d:\Aljun Cerina\FCNG9\Projects\Smart_Farm\backend
npm install
npm start
# ✓ Port 3000 listening
# ✓ MQTT Connected
```

### Terminal 3: Arduino
```
Arduino IDE:
1. Open: custom_mqtt_node/SmartFarm_CustomBackend_Node001.ino
2. Update WiFi SSID/PASS (lines 20-21)
3. Update Backend IP (line 26)
4. Upload & Check Serial Monitor (115200)
# ✓ WiFi connected
# ✓ HTTP Success messages
```

### Terminal 4: Test MQTT
```bash
cd "C:\Program Files\Mosquitto"
mosquitto_sub.exe -h localhost -t "smartfarm/sensor/#"
# ✓ Seeing messages like: 33.45 (temperature)
```

### Mobile: IoT MQTT Panel
```
1. App → + (Add Connection)
   - Address: 192.168.1.100
   - Port: 1883
2. Create panel → Add widgets
   - Topic: smartfarm/sensor/001/temperature
   - Topic: smartfarm/sensor/001/humidity
   - Topic: smartfarm/sensor/001/light_level
3. ✓ Data updating in real-time
```

---

## Critical URLs

| Purpose | URL |
|---------|-----|
| API Health | `http://localhost:3000/api/health` |
| List Sensors | `http://localhost:3000/api/sensors` |
| API Docs | `http://localhost:3000/api/docs` |

---

## Find Your PC IP (for Arduino & IoT Panel)

```powershell
ipconfig
# Look for IPv4 Address under your WiFi adapter
# E.g., 192.168.1.100
```

---

## Arduino Configuration

```cpp
// Line 20-21: WiFi
const char* WIFI_SSID = "YOUR_NETWORK_NAME";
const char* WIFI_PASS = "YOUR_PASSWORD";

// Line 26-27: Backend (use IP from ipconfig)
const char* BACKEND_SERVER = "192.168.1.100";  // ← CHANGE THIS!
const uint16_t BACKEND_PORT = 3000;
```

---

## Backend Configuration

Create `backend/.env`:
```
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_farm_dev
NODE_ENV=development
MQTT_BROKER_URL=mqtt://localhost:1883
```

---

## MQTT Topics

Subscribe to all sensor data:
```
smartfarm/sensor/#
```

Subscribe to specific metrics:
```
smartfarm/sensor/001/temperature
smartfarm/sensor/001/humidity
smartfarm/sensor/001/light_level
smartfarm/sensor/001/all
```

---

## Expected Outputs

### Arduino Serial Monitor
```
[WIFI] Connected! IP: 192.168.1.105
[HTTP] Sending POST to /api/sensors/data
[HTTP] Success (201)
```

### Backend Console
```
[MQTT] ✓ Connected to broker
✓ Data received from sensor 001 (Tondo II): 33.45°C
[MQTT] Published smartfarm/sensor/001/temperature = 33.45
```

### MQTT Subscribe Terminal
```
33.45
65.0
850
{"sensor_id":"001","location":"Tondo II",...}
```

---

## If Something Breaks

1. **Arduino won't connect to WiFi?**
   - Check SSID/password spelling
   - Check WiFi 6GHz (won't work), use 2.4GHz
   - Restart Arduino

2. **Backend won't start?**
   - Port 3000 in use: `netstat -ano | find ":3000"`
   - Kill process: `taskkill /PID <PID> /F`
   - Or use different port in .env

3. **No MQTT messages?**
   - Is Mosquitto running? (Check Terminal 1)
   - Is Backend running? (Check Terminal 2)
   - Is Arduino sending? (Check Serial Monitor)

4. **IoT Panel won't connect?**
   - Check broker IP is correct (use `ipconfig`)
   - Check port 1883 not blocked by firewall
   - Try `localhost` if on same PC

---

## Folder Structure

```
d:\Aljun Cerina\FCNG9\Projects\Smart_Farm\
├── custom_mqtt_node/           ← Arduino sketch HERE
│   └── SmartFarm_CustomBackend_Node001.ino
├── backend/                    ← Backend API HERE
│   ├── src/
│   │   ├── mqtt.js            ← MQTT module
│   │   └── index.js           ← Main server
│   └── .env                   ← Create this
├── MQTT_BROKER_SETUP.md        ← Read this
├── IOT_MQTT_PANEL_SETUP.md     ← Then this
└── COMPLETE_SETUP_AND_TESTING.md ← Then this
```

---

## Time Estimates

- Install Mosquitto: 5 min
- Start Mosquitto: 1 min
- Backend setup: 3 min
- Arduino config: 5 min
- Arduino upload: 5 min
- IoT Panel config: 10 min
- **Total: ~30 minutes** ⏱️

---

## Port Reference

| Service | Port | IP |
|---------|------|-----|
| Mosquitto MQTT | 1883 | localhost:1883 |
| Backend API | 3000 | localhost:3000 |
| PostgreSQL | 5432 | localhost:5432 |
| Arduino WiFi | N/A | 192.168.x.x |

---

## Sensor IDs

Current setup: Sensor 001  
Future: 002, 003, 004, 005

Update Arduino sketch line 48:
```cpp
const char* SENSOR_ID = "001";  // Change for other nodes
```

---

## Common Commands

### Restart MQTT
```bash
taskkill /IM mosquitto.exe /F
# Then start again
```

### Restart Backend
```
Ctrl+C in Terminal 2
npm start
```

### Clear Sensor Data (PostgreSQL)
```bash
psql -U postgres -d smart_farm_dev
DELETE FROM sensor_data;
\q
```

### View Recent Data
```bash
psql -U postgres -d smart_farm_dev -c "SELECT * FROM sensor_data ORDER BY time DESC LIMIT 10;"
```

---

**Print this page for reference during setup!** 📋
