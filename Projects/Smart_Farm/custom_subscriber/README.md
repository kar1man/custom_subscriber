# Custom Subscriber Dashboard (5-Node Web App)

This is a static web-based MQTT subscriber dashboard that connects to **Adafruit IO** and displays **real-time temperature data from 5 Arduino locations** simultaneously. Deploy to GitHub Pages for remote access.

## 5 Locations
- Las Piñas
- Tondo II
- Tondo I
- Makati
- Rizal

## Features
- ✅ Connects to Adafruit IO MQTT broker over WebSocket (TLS, secure)
- ✅ Displays 5 location cards with live temperature data
- ✅ Real-time updates as Arduino nodes publish
- ✅ Staggered data arrival (1s offset per node simulates independent Arduino devices)
- ✅ Shows last update timestamp for each location
- ✅ No backend server required (fully static client-side)
- ✅ Responsive design (works on desktop, tablet, mobile)

## How It Works
1. **Arduino sketch** publishes temperature to Adafruit IO feeds (staggered timing).
2. **Web dashboard** (this app) subscribes to all 5 feeds simultaneously.
3. **IoT MQTT Panel app** (mobile) also subscribes to same Adafruit IO feeds.
All three connect to the same broker.

## Usage

### Local Testing
1. Open `index.html` in a browser.
2. Adafruit username and API key are pre-filled (for testing).
3. Click **"Connect All 5 Nodes"**.
4. Watch the 5 location cards update in real-time as data arrives.

### Deploy to GitHub Pages
1. Commit the `custom_subscriber` folder to your repository.
2. Go to Repository Settings → Pages.
3. Select source: `main` branch, folder `/custom_subscriber`.
4. GitHub will provide a URL: `https://<your-username>.github.io/<repo-name>/custom_subscriber/`
5. Share this URL for remote access.

## Testing Locally with Adafruit IO
1. Arduino must be running and connected to WiFi.
2. Ensure Arduino publishes to these feeds:
   - `smartfarm-temp-las-pinas`
   - `smartfarm-temp-tondo-ii`
   - `smartfarm-temp-tondo-i`
   - `smartfarm-temp-makati`
   - `smartfarm-temp-rizal`
3. Open web dashboard and click Connect.
4. Temperature values appear on cards within 2-5 seconds.

## Security Note
- **Development:** Credentials are hardcoded in browser (visible in source). Acceptable for testing/demos.
- **Production:** Create restricted Adafruit IO account or use backend proxy to hide credentials.

## Configuration
- Broker: Adafruit IO (`io.adafruit.com:8883`)
- Protocol: MQTT over WebSocket (WSS/TLS)
- Update interval: 2000ms (2 seconds)
- Subscription: All 5 feeds simultaneously

## No Additional Services Needed
- No Mosquitto broker required (uses Adafruit IO)
- No custom backend server required (fully static GitHub Pages)
- IoT MQTT Panel app uses same Adafruit IO broker
- Single source of truth for all 3 subscribers

## See Also
- **Arduino Sketch:** `custom_mqtt_node/SmartFarm_CustomBackend_Node001.ino`
- **IoT Panel Config:** `IOT_MQTT_PANEL_CONFIG_5NODES.md`
- **Adafruit IO:** https://io.adafruit.com
