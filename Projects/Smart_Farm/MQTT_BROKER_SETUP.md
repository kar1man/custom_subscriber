# MQTT Broker Setup Guide

## Overview
Your backend now publishes sensor data to an MQTT broker, which the IoT MQTT Panel app subscribes to. This guide sets up a local MQTT broker using Mosquitto.

## Option 1: Mosquitto Installation (Windows)

### Step 1: Download & Install Mosquitto
1. Go to: https://mosquitto.org/download/
2. Download **Windows installer** (e.g., `mosquitto-2.0.18-install-windows-x64.exe`)
3. Run installer, accept defaults
4. Installation path: `C:\Program Files\Mosquitto`

### Step 2: Verify Installation
```powershell
# Open PowerShell
cd "C:\Program Files\Mosquitto"
.\mosquitto --version
# Output should show version like: mosquitto version 2.0.18
```

### Step 3: Start Mosquitto Broker
```powershell
# Keep this terminal running
cd "C:\Program Files\Mosquitto"
.\mosquitto.exe
```

Expected output:
```
1694268345: mosquitto version 2.0.18 starting
1694268345: Using default config from C:\Program Files\Mosquitto\mosquitto.conf
1694268345: Opening ipv4 listen socket on port 1883.
```

---

## Option 2: Docker (If You Have Docker Installed)

```bash
docker run -it --rm \
  -p 1883:1883 \
  -p 9001:9001 \
  --name mosquitto \
  eclipse-mosquitto:latest
```

---

## Verify MQTT Broker is Running

### Test Subscription (New Terminal)
```powershell
# Windows: Open new PowerShell terminal
cd "C:\Program Files\Mosquitto"
.\mosquitto_sub.exe -h localhost -p 1883 -t "smartfarm/sensor/#"
```

You should see:
```
Successfully subscribing to smartfarm/sensor/#
(waiting for messages...)
```

### Test Publishing (Another New Terminal)
```powershell
cd "C:\Program Files\Mosquitto"
.\mosquitto_pub.exe -h localhost -p 1883 -t "smartfarm/sensor/001/temperature" -m "25.5"
```

The first terminal should display:
```
Successfully subscribing to smartfarm/sensor/#
(waiting for messages...)
25.5
```

---

## Configuration (Optional)

### Enable Authentication
If you want username/password protection:

1. Create password file:
```powershell
cd "C:\Program Files\Mosquitto"
.\mosquitto_passwd.exe -c passwordfile smartfarm
# Enter password when prompted
```

2. Edit `C:\Program Files\Mosquitto\mosquitto.conf`:
```conf
listener 1883
protocol mqtt
password_file C:\Program Files\Mosquitto\passwordfile
allow_anonymous false
```

3. Restart Mosquitto

---

## Environment Variables for Backend

Create `.env` in backend folder:
```
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=smartfarm
MQTT_PASSWORD=your_password
```

---

## Topic Structure

Your backend publishes to these topics:

| Topic | Payload | Example |
|-------|---------|---------|
| `smartfarm/sensor/{id}/temperature` | Float | `33.45` |
| `smartfarm/sensor/{id}/humidity` | Float | `65.0` |
| `smartfarm/sensor/{id}/light_level` | Integer | `850` |
| `smartfarm/sensor/{id}/all` | JSON | `{"sensor_id":"001","temperature":33.45,...}` |

### Subscribe to All Sensors
```
smartfarm/sensor/+/temperature     # All temperatures
smartfarm/sensor/+/humidity        # All humidity values
smartfarm/sensor/#                 # ALL data from all sensors
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 1883 already in use | Another MQTT broker running. Kill it or use different port in config |
| `mosquitto_pub: command not found` | Add Mosquitto to PATH or run from install directory |
| No data in subscriptions | Check backend is running and publishing |
| Connection refused | MQTT broker not running, start it first |

---

## Next Steps
1. ✅ Start Mosquitto broker
2. ✅ Run backend (`npm start`)
3. ✅ Run Arduino sketch (sending data)
4. → Configure IoT MQTT Panel (see next guide)
