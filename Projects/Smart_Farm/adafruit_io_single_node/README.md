# Smart Farm Adafruit IO Single-Node Setup

This folder contains the first working proof-of-concept for the smart farm MQTT migration.

## What this does

- Arduino UNO R4 WiFi reads:
  - DHT11 temperature
  - DHT11 humidity
  - LDR light level
- The LDR is used locally to decide DAY or NIGHT.
- The Arduino publishes to Adafruit IO.
- IoT MQTT Panel subscribes and displays the values.

## Feeds used

- `smartfarm-temperature`
- `smartfarm-humidity`
- `smartfarm-status`

## Where to paste your credentials

Open `SmartFarm_Node001.ino` and replace the placeholders at the top:

- `YOUR_WIFI_SSID`
- `YOUR_WIFI_PASSWORD`
- `YOUR_ADAFRUIT_USERNAME`
- `YOUR_ADAFRUIT_ACTIVE_KEY`

## Step-by-step process

1. Create or log in to your Adafruit IO account.
2. Copy your username and active key from Adafruit IO.
3. Create the 3 feeds above.
4. Install Arduino libraries:
   - Adafruit MQTT Library
   - DHT sensor library by Adafruit
   - Adafruit Unified Sensor
5. Install Arduino UNO R4 WiFi support in Boards Manager.
6. Wire the board:
   - DHT11 data to D2
   - LDR voltage divider to A0
   - Yellow LED to D4
   - Blue LED to D5
7. Paste your WiFi and Adafruit values into the sketch.
8. Upload the sketch.
9. Open Serial Monitor at 115200 baud.
10. Confirm WiFi and MQTT connect.
11. In Adafruit IO, confirm feed values are arriving.
12. In IoT MQTT Panel, add panels for temperature, humidity, and status.

## IoT MQTT Panel topic mapping

- Temperature panel topic: `your_username/feeds/smartfarm-temperature`
- Humidity panel topic: `your_username/feeds/smartfarm-humidity`
- Status panel topic: `your_username/feeds/smartfarm-status`

## Notes

- The status feed is the light result, not a separate light feed.
- DAY means the photoresistor detected light.
- NIGHT means the photoresistor detected low light.
- Start with a slow publish interval if Adafruit throttles the device.