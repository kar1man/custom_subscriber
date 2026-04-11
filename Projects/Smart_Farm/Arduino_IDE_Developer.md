# Arduino IDE Developer: Firmware & Edge Computing

## Architecture Overview: STAR TOPOLOGY (5 Nodes → 1 Server)

**YOUR ROLE:** Program each of the **5 Arduino nodes** with firmware that autonomously:
1. Reads DHT11 (temperature, humidity) and LDR (light level)
2. Performs edge computing: checks if daytime before transmitting
3. Sends HTTP POST to the **SAME central Backend server** (192.168.1.100:3000)

**All 5 Arduinos send data to ONE server:**
```
Arduino 001 (North_Field)      ┐
Arduino 002 (Tomato_Greenhouse)├──→ Central Backend Server
Arduino 003 (East_Garage)      │    192.168.1.100:3000
Arduino 004 (South_Storage)    │    (Single Point of Reference)
Arduino 005 (West_Shed)        ┘
```

## Role Overview
You are the **firmware engineer**. Your responsibility is to program the Arduino microcontroller with intelligent sensor drivers and edge computing logic. Each Arduino node will:
1. Read sensor data from DHT11 (temperature, humidity) and LDR (light level)
2. Perform local computation: check if it's daytime using the LDR
3. **Only transmit crop data if daytime** (edge computing — reduce data deluge)
4. Assign a unique Sensor ID and Location Name to each node
5. Send HTTP requests to **the SAME central Backend server** (all 5 nodes use identical server IP:port)

---

## Your Responsibilities

### 1. **Sensor Integration & Drivers**

#### 1.1: DHT11 (Temperature & Humidity Sensor)
The DHT11 is a capacitive humidity and thermistor-based temperature sensor. It uses a single digital pin for data communication.

**Pin Assignment:**
- **Data Pin (DHT11 pin 2):** Arduino Pin 2 (configurable, but standardize for Assembler)
- **Power (DHT11 pin 1):** 5V
- **GND (DHT11 pin 4):** GND
- **Pull-up resistor:** 10kΩ between Data and 5V (required by DHT11)

**DHT11 Library Usage:**
```cpp
#include "DHT.h"
#define DHTPIN 2     // Pin where DHT11 data line is connected
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  dht.begin();  // Initialize sensor
}

void loop() {
  delay(2000);  // DHT11 minimum read interval is 2 seconds
  
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();  // in Celsius
  
  // Check if read failed
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
  
  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
}
```

**Troubleshooting DHT11:**
- "Failed to read": Check data line connection, pull-up resistor
- Frozen readings: Sensor may need replacement
- Readings 0 or 999: Data corruption, check wiring

#### 1.2: LDR (Photoresistor for Light Detection)
The LDR (Light Dependent Resistor) measures ambient light levels. Its resistance decreases as light increases. We read it via an analog input using a voltage divider circuit.

**Voltage Divider Circuit:**
```
     5V
      |
     [10kΩ resistor]
      |
    --+-- Arduino A0 (analog input)
      |
    [LDR] (resistance varies with light: 100Ω bright, ~10kΩ dark)
      |
     GND
```

**Analog Reading Formula:**
- ADC value = 0 to 1023 (0 = 0V, 1023 = 5V)
- Brightness estimation: ADC value ∝ light intensity
- High ADC (800-1023) = bright daylight
- Low ADC (0-200) = dark/nighttime

**LDR Code:**
```cpp
#define LDR_PIN A0  // Analog pin for LDR

void setup() {
  Serial.begin(9600);
  pinMode(LDR_PIN, INPUT);
}

void loop() {
  int lightLevel = analogRead(LDR_PIN);  // 0-1023
  
  Serial.print("Light Level: ");
  Serial.println(lightLevel);
  
  // Determine daytime vs nighttime
  bool isDaytime = lightLevel > 300;  // Threshold: 300 (adjust based on environment)
  
  Serial.print("Is Daytime: ");
  Serial.println(isDaytime ? "YES" : "NO");
  
  delay(5000);  // Read every 5 seconds
}
```

**LDR Threshold Calibration:**
- Outdoors bright sun: ~800-1023
- Outdoors morning/evening: ~400-600
- Indoors with lights: ~200-400
- Complete darkness: ~0-100

**Recommended threshold for agriculture:** 300-400 (filters out twilight, keeps 6 AM - 8 PM data)

### 2. **Edge Computing Logic: Daytime Filter**
The core innovation of your firmware: **Only transmit data during daytime**.

```cpp
#define LIGHT_THRESHOLD 300  // ADC threshold for daytime
#define TRANSMIT_INTERVAL 5000  // Transmit every 5 seconds if daytime

unsigned long lastTransmitTime = 0;

bool isDaylight() {
  int lightLevel = analogRead(LDR_PIN);
  return lightLevel > LIGHT_THRESHOLD;
}

void loop() {
  unsigned long currentTime = millis();
  
  if (currentTime - lastTransmitTime >= TRANSMIT_INTERVAL) {
    lastTransmitTime = currentTime;
    
    // Read sensors
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    int lightLevel = analogRead(LDR_PIN);
    
    // EDGE COMPUTING: Check daytime first
    if (isDaylight()) {
      // Daytime: transmit data to Backend
      transmitData(temperature, humidity, lightLevel, true);
      Serial.println("✓ Data transmitted (daytime)");
    } else {
      // Nighttime: skip transmission, save bandwidth
      Serial.println("✗ Skipping transmission (nighttime)");
      // Optional: log locally to EEPROM for later analysis
    }
  }
}
```

**Why This Matters:**
- **5-second interval** = 12 transmissions/minute = 720/hour = ~7000/day per node
- **5 nodes × 7000/day = 35,000 transmissions/day** without filtering
- **Daytime only (6 AM - 8 PM = 14 hours) = 50% reduction** ✓
- Actual reduction: 65-70% because dawn/dusk data is sparse
- **Saves bandwidth, storage, compute at Backend** ← Edge Computing Win!

### 3. **Unique Sensor ID & Location Assignment**

#### 3.1: Store ID in EEPROM (Persistent Memory)
EEPROM persists even after power loss. Use it to store unique Sensor ID per Arduino.

```cpp
#include <EEPROM.h>

#define EEPROM_SENSOR_ID_ADDR 0    // Address 0-9 reserved for sensor ID
#define EEPROM_LOCATION_ADDR 10    // Address 10-29 reserved for location

char SENSOR_ID[10] = "001";        // Default, can be overwritten
char LOCATION_NAME[20] = "North_Field";  // Default, can be overwritten

void setup() {
  // Read Sensor ID from EEPROM
  readSensorIDFromEEPROM();
  
  Serial.begin(9600);
  Serial.print("Sensor ID: ");
  Serial.println(SENSOR_ID);
  Serial.print("Location: ");
  Serial.println(LOCATION_NAME);
}

void readSensorIDFromEEPROM() {
  // Read bytes from EEPROM
  for (int i = 0; i < 10; i++) {
    SENSOR_ID[i] = EEPROM.read(EEPROM_SENSOR_ID_ADDR + i);
  }
  for (int i = 0; i < 20; i++) {
    LOCATION_NAME[i] = EEPROM.read(EEPROM_LOCATION_ADDR + i);
  }
}

// Configuration function (called once during setup to write ID to EEPROM)
void writeConfigToEEPROM(char* sensorID, char* locationName) {
  for (int i = 0; i < strlen(sensorID) && i < 10; i++) {
    EEPROM.write(EEPROM_SENSOR_ID_ADDR + i, sensorID[i]);
  }
  for (int i = 0; i < strlen(locationName) && i < 20; i++) {
    EEPROM.write(EEPROM_LOCATION_ADDR + i, locationName[i]);
  }
  Serial.println("Configuration written to EEPROM");
}
```

#### 3.2: Configuration Menu (Arduino Assembler friendly)
Provide a way for the Assembler to configure ID before flashing firmware to each node:

**Option A: Hardcoded per Board**
- Create separate firmware files: `SmartFarm_Sensor_001.ino`, `SmartFarm_Sensor_002.ino`, etc.
- Assembler flashes appropriate file to each Arduino
- Simplest, least flexible

**Option B: EEPROM Configuration via Serial**
- Flash same firmware to all Arduinos
- After flashing, Assembler connects serial monitor and types: `CONFIGURE 002 Tomato_Greenhouse`
- Arduino writes ID & location to EEPROM, persists across reboots

```cpp
void handleSerialInput() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.startsWith("CONFIGURE")) {
      // Format: "CONFIGURE 002 Tomato_Greenhouse"
      int firstSpace = command.indexOf(' ');
      int secondSpace = command.indexOf(' ', firstSpace + 1);
      
      String newID = command.substring(firstSpace + 1, secondSpace);
      String newLocation = command.substring(secondSpace + 1);
      
      writeConfigToEEPROM((char*)newID.c_str(), (char*)newLocation.c_str());
      Serial.println("Configuration saved!");
    }
  }
}
```

### 4. **WiFi & HTTP Communication**
Connect Arduino to WiFi and send HTTP POST requests to Backend server.

**Hardware Required:**
- WiFi Shield (Arduino WiFi Shield Rev2 or MKR WiFi 1010) **OR**
- External WiFi module (ESP8266, instructions separate)

**Arduino WiFi Library Setup:**
```cpp
#include <WiFi.h>
#include <WiFiClient.h>

const char* ssid = "FarmNetwork";       // WiFi network name
const char* password = "FarmPass123";   // WiFi password
const char* serverIP = "192.168.1.100"; // Backend server IP (or hostname)
const int serverPort = 3000;            // Backend API port

WiFiClient client;

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi");
  }
}

void setup() {
  Serial.begin(9600);
  connectToWiFi();
}
```

### 5. **JSON Payload Construction & HTTP POST**
Build structured sensor data and send to Backend via HTTP.

```cpp
void transmitData(float temperature, float humidity, int lightLevel, bool isDaytime) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }
  
  // Connect to Backend server
  if (!client.connect(serverIP, serverPort)) {
    Serial.println("Failed to connect to Backend server");
    return;
  }
  
  // Build JSON payload
  String payload = "{";
  payload += "\"sensor_id\":\"" + String(SENSOR_ID) + "\",";
  payload += "\"location\":\"" + String(LOCATION_NAME) + "\",";
  payload += "\"temperature\":" + String(temperature, 1) + ",";
  payload += "\"humidity\":" + String(humidity, 1) + ",";
  payload += "\"light_level\":" + lightLevel + ",";
  payload += "\"is_daytime\":" + (isDaytime ? String("true") : String("false")) + ",";
  payload += "\"timestamp\":\"" + getTimestamp() + "\"";
  payload += "}";
  
  // Send HTTP POST request
  client.println("POST /api/sensors/data HTTP/1.1");
  client.println("Host: " + String(serverIP));
  client.println("Content-Type: application/json");
  client.println("Content-Length: " + String(payload.length()));
  client.println("Connection: close");
  client.println();
  client.print(payload);
  
  // Read response
  while (client.connected()) {
    if (client.available()) {
      char c = client.read();
      Serial.write(c);
    }
  }
  client.stop();
  
  Serial.println("\n✓ Data sent to Backend");
}
```

### 6. **Timestamp Generation**
Arduino doesn't have built-in real-time clock. Options:

**Option A: Use NTP (Network Time Protocol)**
- Arduino queries time server (time.nist.gov) on WiFi
- Accurate, requires internet
- ~1 second overhead per sync

**Option B: Use simple millis() offset**
- Sync time once during setup, use millis() offset
- Less accurate (clock drift), but fast
- Good for testing

```cpp
#include <time.h>

unsigned long epochTime = 0;  // Unix timestamp at startup
unsigned long bootTime = 0;   // millis() at startup

void syncTimeWithNTP() {
  // Simplified NTP sync (production would use proper library)
  // For demo: manually set epoch time
  epochTime = 1711900800;  // 2026-03-31 00:00:00 UTC (example)
  bootTime = millis();
  
  Serial.print("System time synced to: ");
  Serial.println(epochTime);
}

String getTimestamp() {
  // Get current time as ISO 8601 UTC string
  unsigned long currentEpoch = epochTime + (millis() - bootTime) / 1000;
  
  // Simple conversion (assumes UTC, doesn't handle leap seconds)
  time_t t = currentEpoch;
  struct tm* timeinfo = gmtime(&t);
  
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
  return String(buffer);
}
```

**Better Option: Use RTC Module (DS3231)**
- Hardware real-time clock ($2-5)
- Accurate, no internet needed
- Pins: SDA (pin 20), SCL (pin 21) on Arduino Mega / (A4, A5) on Uno

### 7. **Error Handling & Retry Logic**
Handle network failures gracefully:

```cpp
const int MAX_RETRIES = 3;
const int RETRY_DELAY = 2000;  // ms

void transmitDataWithRetry(float temperature, float humidity, int lightLevel, bool isDaytime) {
  int retries = 0;
  
  while (retries < MAX_RETRIES) {
    if (transmitData(temperature, humidity, lightLevel, isDaytime)) {
      return;  // Success
    }
    
    retries++;
    if (retries < MAX_RETRIES) {
      Serial.print("Retry ");
      Serial.print(retries);
      Serial.println("...");
      delay(RETRY_DELAY);
    }
  }
  
  Serial.println("Failed to transmit after " + String(MAX_RETRIES) + " retries");
  // Optional: log to local storage for later transmission
}

bool transmitData(float temperature, float humidity, int lightLevel, bool isDaytime) {
  // Attempt transmission, return true on success
  // (detailed implementation above)
}
```

### 8. **Power Efficiency (Optional but Recommended)**
For battery-powered nodes, optimize power consumption:

```cpp
void setup() {
  // Set WiFi to low power mode when not transmitting
  WiFi.lowPowerMode();
  
  // Set ADC to lower resolution if needed (less noise but faster)
  analogReadResolution(10);  // 10-bit (default)
}

void loop() {
  // Go to sleep between transmissions
  // Arduino only wakes up for WiFi activities
  // WiFi.deepSleep(5000);  // Sleep 5 seconds
  delay(5000);  // For wired power, simple delay is fine
}
```

---

## Deliverables Checklist

- [ ] **Main Firmware Sketch** (`SmartFarm_Node.ino`)
  - DHT11 sensor reading (temperature, humidity)
  - LDR sensor reading (light level) and daytime detection
  - Edge computing logic: conditional transmission based on daytime
  - WiFi connection and HTTP POST to Backend
  - JSON payload construction with Sensor ID, Location, timestamp
  - Configuration via EEPROM
  - Error handling and retries

- [ ] **Configuration Template** (`CONFIG_GUIDE.md`)
  - Step-by-step: configure Sensor ID "001", Location "North_Field"
  - How to use EEPROM configuration menu
  - WiFi SSID/password setup
  - Backend server IP and port settings

- [ ] **Wiring Diagram** (`WIRING_DIAGRAM.md` with ASCII art or image)
  - DHT11 connections (data pin 2, 5V, GND, pull-up)
  - LDR voltage divider (pin A0, 10kΩ resistor, 5V, GND)
  - WiFi Shield connections (SPI pins)
  - Optional RTC module (I2C pins for accurate timestamps)

- [ ] **Test Sketch for Components** (`Test_DHT11.ino`, `Test_LDR.ino`)
  - Isolated DHT11 reading test (verify sensor responds)
  - Isolated LDR reading test (verify light detection works)
  - WiFi connectivity test (connect to router, print IP)
  - HTTP POST test (send dummy JSON to Backend)

- [ ] **Payload Specification** (`PAYLOAD_SPEC.md`)
  - Example JSON payload from Arduino
  - Field definitions (sensor_id: string, temperature: float, etc.)
  - Timestamp format (ISO 8601 UTC)
  - Shared with Backend Dev 1 for validation rules

- [ ] **Troubleshooting Guide** (`TROUBLESHOOTING.md`)
  - "DHT11 returns NaN or 0"
  - "LDR always reads max value"
  - "WiFi connects but data doesn't reach Backend"
  - "Configuration doesn't persist after reboot"

- [ ] **Performance Metrics Document** (`PERFORMANCE.md`)
  - CPU usage during operation
  - Data transmission size (~200 bytes per payload)
  - WiFi signal strength at different distances
  - Battery life estimate (if applicable)

- [ ] **Libraries List** (`LIBRARIES.txt`)
  - DHT sensor library (specify version)
  - WiFi library
  - Optional: Time library for NTP sync
  - Instructions: Arduino IDE → Sketch → Include Library → Manage Libraries

- [ ] **Dependencies & Verification** (`COMPONENT_VERIFICATION.md`)
  - Checklist: DHT11 reads without errors 10x in a row
  - Checklist: LDR threshold correctly filters daytime vs nighttime (manual testing)
  - Checklist: WiFi connects within 10 seconds
  - Checklist: HTTP POST receives 200 response from Backend

---

## Tech Stack Recommendations

| Component | Recommendation |
|---|---|
| **Microcontroller** | Arduino Mega 2560 (most pins) or Arduino Uno (limited) |
| **WiFi Module** | Arduino WiFi Shield Rev2 or ESP8266 breakout |
| **Sensor Library** | Adafruit DHT Sensor Library v1.4+ |
| **HTTP Client** | Built-in WiFi library (WiFiClient) |
| **Real-Time Clock** | DS3231 I2C module (optional, for timestamp accuracy) |
| **Power Supply** | 5V 1A minimum (WiFi draws current when transmitting) |
| **Optional: Battery** | 4 x AA NiMH (6V nominal) + voltage regulator to 5V + solar charger |

---

## Pin Assignment (Reference - STANDARDIZE for Assembler)

```
Arduino Mega 2560 Pinout (recommended for this project):
┌─────────────────────────────────────┐
│ DHT11                 A0 ←── LDR    │
│ ├─ Data: Pin 2                      │
│ ├─ 5V: 5V                           │
│ └─ GND: GND                         │
│                                     │
│ WiFi Shield SPI Pins:               │
│ ├─ MISO: Pin 50                     │
│ ├─ MOSI: Pin 51                     │
│ ├─ SCK: Pin 52                      │
│ └─ SS: Pin 53                       │
│                                     │
│ Optional RTC (I2C):                 │
│ ├─ SDA: Pin 20                      │
│ └─ SCL: Pin 21                      │
└─────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Sensor Integration (Local Testing)
1. Wire DHT11 to Arduino
2. Install Adafruit DHT library
3. Read temperature/humidity successfully (no NaN errors)
4. Wire LDR with voltage divider
5. Read light levels, calibrate threshold (300 for daytime)

### Phase 2: Edge Computing Logic
1. Implement daytime check function
2. Implement conditional transmission logic
3. Verify: transmit at noon, skip at midnight (manual testing)

### Phase 3: WiFi & Configuration
1. Connect WiFi Shield
2. Configure SSID/password
3. Implement EEPROM configuration menu for Sensor ID
4. Verify: Arduino displays "Sensor ID: 001, Location: North_Field"

### Phase 4: HTTP Communication
1. Implement JSON payload construction
2. Implement HTTP POST to Backend
3. Verify with mock Backend server (Postman, or simple Node.js server)
4. Check Backend receives valid JSON with all required fields

### Phase 5: Integration & Testing
1. Connect to live Backend server (Backend Dev 1 provides URL)
2. Verify data appears in Backend database
3. Test with Assembler: flash to physical board, verify end-to-end
4. Handle edge cases: WiFi disconnect, Backend timeout, sensor malfunction

---

## Integration Points

### → Arduino Assembler
**You provide:** Firmware .ino file, wiring diagram, configuration guide  
**Assembler does:** Builds physical circuit, flashes firmware to boards, tests connections

### → Backend Developer 1
**You define:** JSON payload format, HTTP POST endpoint requirements  
**Backend Dev 1 provides:** API endpoint URL, expected request format  
**Sync point:** Phase 1 spec meeting to agree on payload schema

### → Backend Developer 2 (Indirect)
Your code implements edge computing (daytime-only transmission).  
Backend Dev 2 validates this rule is working correctly (should see gaps at night).

---

## Testing Strategy

### Unit Tests (Isolated Component Tests)
```cpp
// Test 1: DHT11 reading is plausible
void test_DHT11_reading() {
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  assert(temp > -10 && temp < 60, "Temperature out of plausible range");
  assert(humidity >= 0 && humidity <= 100, "Humidity out of range");
  Serial.println("✓ DHT11 reading test passed");
}

// Test 2: LDR threshold works
void test_LDR_threshold() {
  int lightLevel = analogRead(LDR_PIN);
  bool isDaytime = lightLevel > 300;
  
  // At noon: isDaytime should be TRUE
  assert(isDaytime == true, "Expected daytime at noon");
  Serial.println("✓ LDR threshold test passed");
}

// Test 3: JSON payload is valid
void test_JSON_payload_generation() {
  String payload = buildPayload(25.5, 60, 850, true);
  
  assert(payload.indexOf("\"sensor_id\":\"001\"") >= 0, "Missing sensor_id");
  assert(payload.indexOf("\"temperature\":25.5") >= 0, "Missing temperature");
  Serial.println("✓ JSON payload test passed");
}
```

### Integration Tests (Full System)
1. **WiFi + Backend Connection:**
   - Arduino connects to WiFi
   - Arduino successfully POSTs to Backend
   - Backend receives valid JSON

2. **Edge Computing Behavior:**
   - At 2 PM: Arduino transmits every 5 seconds
   - At 2 AM: Arduino skips all transmissions (verify via Backend data gap)
   - Light threshold transition: verify edge cases at dawn/dusk

3. **Error Recovery:**
   - WiFi drops mid-transmission: Arduino retries and succeeds
   - Backend server unreachable: Arduino logs error, continues cycling
   - Malformed response from Backend: Arduino handles gracefully

---

## Acceptance Criteria (Definition of Done)

You're done when:
1. ✅ Firmware successfully reads DHT11 temperature and humidity (no NaN)
2. ✅ LDR correctly detects daylight vs nighttime (threshold calibrated)
3. ✅ Edge computing works: transmits at noon, skips at midnight
4. ✅ WiFi connects to network within 10 seconds
5. ✅ JSON payload is properly formatted (Backend Dev 1 confirms)
6. ✅ HTTP POST to Backend receives 200 response
7. ✅ Configuration via EEPROM works (Sensor ID persists after reboot)
8. ✅ Wiring diagram complete with all pin assignments labeled
9. ✅ Test sketches verify each component isolation (DHT11, LDR, WiFi)
10. ✅ Code compiles without errors in Arduino IDE
11. ✅ End-to-end verified with Backend: data transmitted → stored in database → visible in API response
12. ✅ Code reviewed by Assembler for clarity and ease of flashing

---

## Success Signals

- Firmware compiles and uploads to Arduino without errors
- Serial monitor shows: "Temperature: 24.5°C, Humidity: 65%, Light: 850, Is Daytime: YES"
- HTTP POST returns "200 OK" with response body "{"status": "success"}"
- Backend database contains sensor data with correct Sensor ID and Location
- No data transmitted at 3:00 AM (nighttime, edge computing working correctly)
- Assembler reports: "Easy to flash, configuration worked, sensor readings stable"

---

## Quick Start Template

```cpp
#include "DHT.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <EEPROM.h>

// ===== Configuration =====
#define DHTPIN 2
#define DHTTYPE DHT11
#define LDR_PIN A0
#define LIGHT_THRESHOLD 300

const char* ssid = "FarmNetwork";
const char* password = "FarmPass123";
const char* serverIP = "192.168.1.100";
const int serverPort = 3000;

// ===== Global Objects =====
DHT dht(DHTPIN, DHTTYPE);
WiFiClient client;
char SENSOR_ID[10] = "001";
char LOCATION_NAME[20] = "North_Field";

void setup() {
  Serial.begin(9600);
  dht.begin();
  connectToWiFi();
  readConfigFromEEPROM();
  Serial.print("Sensor: ");
  Serial.println(SENSOR_ID);
}

void loop() {
  delay(5000);
  
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  int lightLevel = analogRead(LDR_PIN);
  bool isDaytime = lightLevel > LIGHT_THRESHOLD;
  
  if (isDaytime) {
    transmitData(temp, humidity, lightLevel, isDaytime);
  }
}

// [All supporting functions: connectToWiFi, transmitData, 
// readConfigFromEEPROM, etc. — see detailed implementations above]
```

