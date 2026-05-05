# IoT MQTT Panel Configuration (5-Node Setup)

This guide shows how to configure the **IoT MQTT Panel** mobile/desktop app to monitor all 5 Arduino locations in real-time.

## What is IoT MQTT Panel?
A mobile app (Android/iOS) that connects to MQTT brokers and displays real-time data in a customizable dashboard. In your setup, it subscribes to the same **Adafruit IO** broker that your Arduino publishes to.

## Step 1: Install IoT MQTT Panel

### Android
1. Open **Google Play Store**
2. Search: "IoT MQTT Panel"
3. Developer: **Niels Brouwers**
4. Tap **Install**

### iOS / Desktop
- Visit: https://github.com/TamaraAbells/IoT-MQTT-Panel (unofficial web version)
- Or search iOS App Store for similar MQTT dashboard apps

---

## Step 2: Add Connection to Adafruit IO

### In IoT MQTT Panel App:
1. Tap the **"+"** button or **"Add Connection"**
2. Fill in:

| Field | Value |
|-------|-------|
| **Connection Name** | SmartFarm-Adafruit |
| **Broker Host** | `io.adafruit.com` |
| **Broker Port** | `8883` |
| **Username** | `accerina` |
| **Password** | `YOUR_ADAFRUIT_IO_KEY_HERE` |
| **TLS/SSL** | **ON** (enabled) |
| **Client ID** | `iot-panel-smartfarm-001` |
| **Clean Session** | ON |
| **Keep Alive** | `60` |

3. Tap **"Save"** or **"Connect"**

You should see a **green indicator** showing connected status.

---

## Step 3: Create Dashboard Panels

### Panel 1: Las Piñas
1. Tap **"+"** to add new panel
2. Name: `Las Piñas`
3. Tap **"Add Item"**
4. Add widget:
   - **Type:** Value Display
   - **Label:** Temperature
   - **Topic:** `accerina/feeds/smartfarm-temp-las-pinas`
   - **Unit:** °C
   - **Update Interval:** 2000ms
5. Save

**Result:** Live temperature display for Las Piñas location

### Panel 2: Tondo II
Repeat above with:
- **Label:** Tondo II Temperature
- **Topic:** `accerina/feeds/smartfarm-temp-tondo-ii`

### Panel 3: Tondo I
- **Label:** Tondo I Temperature
- **Topic:** `accerina/feeds/smartfarm-temp-tondo-i`

### Panel 4: Makati
- **Label:** Makati Temperature
- **Topic:** `accerina/feeds/smartfarm-temp-makati`

### Panel 5: Rizal
- **Label:** Rizal Temperature
- **Topic:** `accerina/feeds/smartfarm-temp-rizal`

---

## Step 4: (Optional) Add Gauge Widgets

For visual gauges instead of text:

1. Add item to any panel
2. **Type:** Gauge
3. **Topic:** `accerina/feeds/smartfarm-temp-[location]`
4. **Min Value:** `20`
5. **Max Value:** `40`
6. **Unit:** °C

---

## Step 5: (Optional) Add Multi-Node Widget

Some MQTT panel apps support subscribing to multiple topics. Use wildcard:

- **Topic:** `accerina/feeds/smartfarm-temp-+`

This will capture messages from ANY feed matching the pattern (all 5 locations).

---

## Topic Reference Table

Your Arduino publishes to these Adafruit IO feeds (automatically visible in IoT Panel):

| Location | Feed Name | Full Topic |
|----------|-----------|-----------|
| Las Piñas | smartfarm-temp-las-pinas | accerina/feeds/smartfarm-temp-las-pinas |
| Tondo II | smartfarm-temp-tondo-ii | accerina/feeds/smartfarm-temp-tondo-ii |
| Tondo I | smartfarm-temp-tondo-i | accerina/feeds/smartfarm-temp-tondo-i |
| Makati | smartfarm-temp-makati | accerina/feeds/smartfarm-temp-makati |
| Rizal | smartfarm-temp-rizal | accerina/feeds/smartfarm-temp-rizal |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Can't connect** | Check username/password, ensure TLS is ON |
| **No data showing** | Verify topics match exactly, check Arduino is publishing |
| **Red/Disconnected** | Connection lost, app will auto-reconnect in 30-60s |
| **Topics not found** | Create feeds in Adafruit IO first (Arduino will create them on first publish) |
| **Slow updates** | Reduce "Update Interval" (2000ms = 2s is recommended) |

---

## Dashboard Layout Example

Once configured, you'll see something like:

```
┌─────────────────────────────────────────┐
│ SmartFarm - 5 Locations Dashboard       │
├─────────────────────────────────────────┤
│  Las Piñas: 30.8°C  │  Tondo II: 33.4°C │
│  Tondo I: 31.5°C    │  Makati: 31.0°C   │
│  Rizal: 30.6°C                          │
└─────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Arduino sketch simulates 5 nodes, publishes to Adafruit IO at staggered times (1s offset each)
2. ✅ Web dashboard (custom_subscriber) shows all 5 locations via Adafruit IO (GitHub Pages)
3. ✅ IoT MQTT Panel app (mobile/desktop) subscribes to same Adafruit IO broker
4. All 3 receive real-time data from the same source

No additional broker or backend server needed — Adafruit IO is your central MQTT broker.
