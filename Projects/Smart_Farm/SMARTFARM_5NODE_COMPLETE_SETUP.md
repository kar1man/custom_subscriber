# SmartFarm 5-Node Complete Setup & Testing Guide

## ✅ What's Ready

All components are now configured for a complete 5-node monitoring system with staggered data transmission:

### 1. **Arduino Sketch** (Multi-Node Simulator)
**File:** `custom_mqtt_node/SmartFarm_CustomBackend_Node001.ino`

- **Simulates 5 locations** with independent temperature cycles
- **Staggered publishing** (1 second offset between each location)
- **Publishing pattern:**
  - Node 1 (Las Piñas): publishes at 0s, 5s, 10s...
  - Node 2 (Tondo II): publishes at 1s, 6s, 11s...
  - Node 3 (Tondo I): publishes at 2s, 7s, 12s...
  - Node 4 (Makati): publishes at 3s, 8s, 13s...
  - Node 5 (Rizal): publishes at 4s, 9s, 14s...

**Result:** Looks like 5 independent Arduino devices connecting/sending at different times.

### 2. **Web Dashboard** (GitHub Pages Compatible)
**Folder:** `custom_subscriber/`

- **5-node grid layout** with responsive cards
- **Real-time temperature display** per location
- **Last update timestamp** for each node
- **Visual "active" state** when data received
- **Pre-filled Adafruit credentials** (change in production)
- **Deploy anywhere:** GitHub Pages, Netlify, local testing

**Files included:**
- `index.html` — Main dashboard UI
- `app.js` — MQTT client logic (staggered subscription)
- `styles.css` — Responsive grid layout
- `README.md` — Deployment guide

### 3. **IoT MQTT Panel Configuration**
**File:** `IOT_MQTT_PANEL_CONFIG_5NODES.md`

- **Step-by-step setup** for mobile/desktop app
- **Connection parameters** pre-configured
- **Widget configuration** for each of 5 locations
- **Troubleshooting guide**

---

## 🧪 Testing Sequence

### Test 1: Local Arduino Simulation (Verify Staggered Data)
**Goal:** Ensure Arduino publishes each location at different times

**Steps:**
1. Upload `SmartFarm_CustomBackend_Node001.ino` to your Arduino
2. Open Arduino Serial Monitor (115200 baud)
3. Watch the output:
   ```
   [HTTP] Node 1 (Las Piñas) → 28.5°C
   [HTTP] Node 2 (Tondo II) → 29.3°C
   [HTTP] Node 3 (Tondo I) → 30.1°C
   [HTTP] Node 4 (Makati) → 31.2°C
   [HTTP] Node 5 (Rizal) → 28.9°C
   ```
4. **Expected:** One node publishes every ~1 second (staggered, not all at once)

**Success Indicator:** Each node appears in sequence, then repeats

---

### Test 2: Adafruit IO Feed Verification
**Goal:** Confirm Arduino successfully publishes to Adafruit IO

**Steps:**
1. Go to https://io.adafruit.com
2. Log in (username: `accerina`)
3. Look at Feeds → verify all 5 feeds exist:
   - `smartfarm-temp-las-pinas`
   - `smartfarm-temp-tondo-ii`
   - `smartfarm-temp-tondo-i`
   - `smartfarm-temp-makati`
   - `smartfarm-temp-rizal`
4. Click each feed and look at **Activity** or **Logs**
5. Verify recent timestamps and temperature values

**Success Indicator:** All 5 feeds have data within last 30 seconds

---

### Test 3: Web Dashboard Local Testing
**Goal:** Test dashboard connects and displays all 5 locations

**Steps:**
1. Open `custom_subscriber/index.html` in a browser
2. Adafruit username and API key should be pre-filled
3. Click **"Connect All 5 Nodes"**
4. Watch the 5 cards for data:
   - Las Piñas card shows temperature
   - Tondo II card shows temperature
   - Tondo I card shows temperature
   - Makati card shows temperature
   - Rizal card shows temperature
5. Each card should show:
   - Location name
   - Temperature (°C)
   - Feed name
   - Last update timestamp (e.g., "Updated: 14:32:45")

**Expected behavior:** Data appears within 2-5 seconds of Arduino publishing

**Success Indicator:** All 5 cards populated with temperatures and timestamps

---

### Test 4: GitHub Pages Deployment
**Goal:** Make dashboard remotely accessible

**Steps:**
1. Commit `custom_subscriber/` folder to GitHub repository
2. Go to Repository Settings → Pages
3. Select source: `main` branch, folder `/(root)` or `/custom_subscriber`
4. GitHub will display deployment URL (usually takes 1-2 minutes)
5. Visit the URL from mobile phone or different network
6. Dashboard should display same 5-node data

**Success Indicator:** Remote URL loads dashboard, shows real-time data

---

### Test 5: IoT MQTT Panel Configuration
**Goal:** Test mobile app connection to Adafruit IO

**Steps:**
1. Install IoT MQTT Panel app (Android/iOS)
2. Follow guide: `IOT_MQTT_PANEL_CONFIG_5NODES.md`
3. Add new connection:
   - Host: `io.adafruit.com`
   - Port: `8883`
   - Username: `accerina`
   - Password: `YOUR_ADAFRUIT_IO_KEY_HERE`
   - TLS: **ON**
4. Create 5 value display widgets (one per location)
5. Subscribe to topics:
   - `accerina/feeds/smartfarm-temp-las-pinas`
   - `accerina/feeds/smartfarm-temp-tondo-ii`
   - etc.
6. Verify data updates in real-time

**Success Indicator:** App shows all 5 temperature values updating

---

## 🔄 Complete Data Flow

```
┌──────────────────┐
│    Arduino x5    │ (simulates 5 nodes, publishes staggered)
│  Staggered Send  │
└────────┬─────────┘
         │ HTTP POST (every 1s, staggered)
         │
         ▼
┌──────────────────────────┐
│   Adafruit IO Broker     │ (5 feeds, central repository)
│  wss://io.adafruit.com   │
└────────┬─────────────────┘
         │
    ┌────┴────────────────────┐
    │                         │
    ▼                         ▼
┌──────────────────────┐  ┌──────────────────┐
│  Web Dashboard       │  │  IoT MQTT Panel  │
│  (GitHub Pages)      │  │  (Mobile App)    │
│  5 location cards    │  │  5 widgets       │
│  Real-time updates   │  │  Live monitoring │
└──────────────────────┘  └──────────────────┘

     Both subscribe to same Adafruit feeds
```

---

## 🎯 What Each Component Does

| Component | Role | Update Frequency | Access |
|-----------|------|------------------|--------|
| **Arduino Sketch** | Publishes sensor data | Every 5s (staggered) | Local/USB |
| **Adafruit IO** | Central broker | Real-time | Cloud |
| **Web Dashboard** | Visual monitoring | 2-5s after publish | Browser (GitHub Pages) |
| **IoT MQTT Panel** | Mobile monitoring | 2-5s after publish | Mobile App |

---

## 📋 Pre-Deployment Checklist

- [ ] Arduino sketch updated with 5-node stagger logic
- [ ] Arduino connected to WiFi with valid SSID/password
- [ ] Adafruit IO credentials correct in Arduino sketch
- [ ] All 5 feeds created in Adafruit IO
- [ ] Arduino publishes data successfully (check Serial Monitor)
- [ ] Web dashboard HTML/JS/CSS files have pre-filled Adafruit credentials
- [ ] Test web dashboard locally (open index.html)
- [ ] Commit custom_subscriber folder to GitHub
- [ ] Enable GitHub Pages from repository settings
- [ ] Test GitHub Pages URL from different network
- [ ] IoT MQTT Panel app installed and configured
- [ ] IoT Panel displays all 5 locations with live data

---

## 🔧 Troubleshooting

### Arduino not publishing
1. Check WiFi connection (Serial Monitor shows connection status)
2. Verify Adafruit credentials in sketch
3. Confirm API endpoint is reachable (test with curl)

### Web dashboard shows "Never" for all updates
1. Check browser console for errors (F12 → Console)
2. Verify Adafruit credentials in index.html
3. Ensure Arduino is actively publishing (Adafruit IO dashboard shows recent data)

### IoT MQTT Panel won't connect
1. Verify TLS is enabled (port 8883)
2. Check username/password exactly
3. Test connection with web dashboard first to isolate issue

### GitHub Pages shows 404
1. Verify repository settings → Pages shows correct source branch/folder
2. Wait 2-3 minutes for initial deployment
3. Check URL format: `https://username.github.io/repo-name/custom_subscriber/`

---

## 🚀 Next Steps After Testing

1. **Customize credentials** (remove hardcoded keys before public deployment)
2. **Update dashboard styling** (colors, layout, branding)
3. **Add data logging** (store historical temperatures)
4. **Scale to more nodes** (add more Arduino devices with unique feed names)
5. **Add alerts** (notify if temperature out of range)

---

## 📚 Reference Files

- **Arduino Sketch:** `custom_mqtt_node/SmartFarm_CustomBackend_Node001.ino`
- **Web Dashboard:** `custom_subscriber/`
- **IoT Panel Guide:** `IOT_MQTT_PANEL_CONFIG_5NODES.md`
- **Adafruit IO:** https://io.adafruit.com
- **mqtt.js Library:** https://unpkg.com/mqtt/dist/mqtt.min.js

---

**Status:** ✅ Complete and ready for testing!
