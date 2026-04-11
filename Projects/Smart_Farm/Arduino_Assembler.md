# Arduino Assembler: Hardware Integration & Testing

## Architecture Overview: STAR TOPOLOGY - 5 NODES TO 1 SERVER

**YOUR MISSION:** Build and test **5 physical Arduino sensor nodes**, each deployed to a different farm location, all sending data to **ONE central Backend server**.

```
FARM LOCATIONS (5 Sites):                CENTRAL SERVER:
┌─────────────────────┐
│ Node 001 (Sensor)   │ North_Field
│ DHT11 + LDR         │                  ┌─────────────────────┐
│ WiFi → 192.168.1.100│ ─────────────→  │  Backend Server     │
└─────────────────────┘                  │ 192.168.1.100:3000 │
                                         │                     │
┌─────────────────────┐                  │  ONE Database:      │
│ Node 002           │ Tomato_Greenhouse│  - All 5 node data  │
│ DHT11 + LDR        │ ─────────────→  │  - Consolidated   │
│ WiFi → 192.168.1.100│                  │  - One location     │
└─────────────────────┘                  └─────────────────────┘
                                               ▲
┌─────────────────────┐                        │
│ Node 003           │ East_Garage             │
│ DHT11 + LDR        │ ─────────────→ ─────────┘
│ WiFi → 192.168.1.100│
└─────────────────────┘

┌─────────────────────┐
│ Node 004           │ South_Storage
│ DHT11 + LDR        │ ─────────────→ ─────────┐
│ WiFi → 192.168.1.100│                        │
└─────────────────────┘                        │
                                               │
┌─────────────────────┐                        │
│ Node 005           │ West_Shed              │
│ DHT11 + LDR        │ ─────────────→ ─────────┘
│ WiFi → 192.168.1.100│
└─────────────────────┘

KEY POINTS:
✓ Same server IP:port for ALL 5 Arduinos (192.168.1.100:3000)
✓ Each node has UNIQUE Sensor ID (001-005)
✓ Each node has UNIQUE Location Name
✓ All nodes send HTTP POST to THE SAME server
✓ No node-to-node communication
✓ One consolidated database for all farm data
```

## Role Overview
You are the **hardware engineer and integration specialist**. Your responsibility is to physically build each of the **5 sensor nodes** by assembling electronic components, flashing the Arduino IDE firmware onto each board with unique configurations, and rigorously testing that each node works end-to-end before deployment to its assigned farm location. Each node will connect to the **SAME central Backend server** (all 5 share identical server address: 192.168.1.100:3000).

---

## Your Responsibilities

### 1. **Hardware Bill of Materials (BOM)**
Collect and organize all electronic components for building 5 sensor nodes.

| Qty | Component | Part Number | Cost | Supplier | Notes |
|-----|-----------|-------------|------|----------|-------|
| 5 | Arduino Mega 2560 | A000067 | $15 | amazon.com | Microcontroller |
| 5 | DHT11 Sensor | DHT11 | $2 | aliexpress.com | Temp + Humidity |
| 5 | LDR (5mm photoresistor) | GL5537 | $0.50 | ebay.com | Light detection |
| 5 | 10kΩ resistor | 1/4W carbon film | $0.10 | local | Voltage divider for LDR |
| 5 | 10kΩ resistor | 1/4W carbon film | $0.10 | local | DHT11 pull-up |
| 5 | WiFi Shield Rev2 | A000100 | $40 | arduino.cc | WiFi connectivity |
| 5 | Ethernet cable (1m) | CAT6 | $5 | amazon.com | Connect to router |
| 1 | Breadboard (830 tie points) | MB102 | $5 | amazon.com | Prototyping (reusable) |
| 1 | Jumper wires assortment | Dupont | $8 | amazon.com | Connections (reusable) |
| 5 | Micro-USB cable + 5V PSU | 5V/1A | $3 | amazon.com | Power supply per node |
| 5 | Waterproof enclosure box | IP65 plastic | $8 | alibaba.com | Protect from rain/moisture |
| 1 | Multimeter | DT830B | $10 | amazon.com | Debugging, testing (reusable) |
| 1 | USB-to-Serial adapter | FTDI | $5 | amazon.com | Configure EEPROM (reusable) |

**Total Cost per Node: ~$95** (expensive WiFi Shield dominates cost)  
**Total for 5 Nodes: ~$475**  
**Cost Reduction:** Consider ESP8266 ($8) as WiFi module instead of Shield ($40), saving $160 for 5 nodes.

### 2. **Circuit Assembly for Each Node**

#### 2.1: Breadboard Layout (Standard for all 5 nodes)

Physical setup:
```
┌─────────────────────────────────────────────────────────────┐
│ Arduino Mega 2560                                           │
│  (Powers from 5V PSU via USB)                               │
│                                                             │
│  Pins: 2, 5V, GND, A0                                       │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ Breadboard (Prototyping)                                    │
│                                                             │
│  Sensor A (DHT11):        Sensor B (LDR):                   │
│  Data → Pin 2             LDR A0 → Analog input            │
│  (+) → 5V                 (+) → 5V                         │
│  (-) → GND                (-) → GND (via 10kΩ resistor)     │
│  Pull-up: 10kΩ (2→5V)     Voltage divider: 10kΩ            │
│                                                             │
│  [DHT11]  [Resistors]  [LDR]  [Jumpers]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2: Detailed Wiring Steps

**Step 1: Power Rails**
1. Place Arduino Mega on breadboard (or next to it with jumpers)
2. Connect breadboard **Red rail (5V)** to Arduino **5V pin**
3. Connect breadboard **Black rail (GND)** to Arduino **GND pin**
4. Test with Multimeter: measure 5V between red and black rails

**Step 2: DHT11 Temperature & Humidity Sensor**
```
DHT11 pinout (front view, left to right):
[1] VCC    [2] Data   [3] NC   [4] GND

Connections:
- Pin 1 (VCC) → Breadboard 5V rail
- Pin 2 (Data) → Arduino Pin 2 (with 10kΩ pull-up resistor to 5V)
- Pin 4 (GND) → Breadboard GND rail

Pull-up resistor (IMPORTANT):
- 10kΩ resistor between DHT11 pin 2 and 5V rail
- Purpose: Ensure clean digital signal transitions
```

**Step 3: LDR (Photoresistor) Light Sensor**
```
LDR voltage divider circuit:
                  5V
                  |
              10kΩ resistor R_fixed
                  |
        A0(input)-+---- LDR (variable resistance)
                  |
                 GND

Connections:
- 5V → 10kΩ resistor → Arduino A0 (analog input) → LDR → GND

Voltage calculation:
V_A0 = 5V × R_LDR / (R_fixed + R_LDR)
- Bright sunlight: R_LDR ≈ 100Ω → V_A0 ≈ 4.7V → ADC ≈ 960
- Dim/dark: R_LDR ≈ 10kΩ → V_A0 ≈ 2.5V → ADC ≈ 500
- Dark room: R_LDR ≈ 100kΩ → V_A0 ≈ 0.33V → ADC ≈ 67
```

**Step 4: WiFi Shield**
1. Stack WiFi Shield on top of Arduino Mega
2. Align pins carefully; shield PCB should rest flat on Arduino headers
3. Connect WiFi Shield to router via Ethernet cable (RJ45 port on shield)

**Step 5: Power Connection**
- Connect 5V USB power supply to Arduino Mega via Micro-USB port
- Power LED on Arduino should light up (red)
- Arduino should boot (LED blinks once)

**Wiring Checklist:**
- [ ] 5V rail connected to Arduino 5V pin (measure ~5V)
- [ ] GND rail connected to Arduino GND pin (measure 0V)
- [ ] DHT11 data pin connected to Arduino pin 2
- [ ] DHT11 has 10kΩ pull-up resistor to 5V
- [ ] LDR connected in voltage divider to Arduino A0
- [ ] WiFi Shield stacked on Arduino
- [ ] Power supply connected and board boots
- [ ] No visible short circuits or component damage

### 3. **Arduino IDE Setup & Configuration**

#### 3.1: Install Arduino IDE
1. Download Arduino IDE 2.0+ from [arduino.cc/software](https://arduino.cc/software)
2. Install on your machine
3. Open Arduino IDE

#### 3.2: Board Configuration
1. **Board Setup:**
   - Tools → Board → Select "Arduino Mega 2560"
   - Tools → Port → Select COM port (COM3, COM4, etc.)
   - Tools → Upload Speed → 115200
   
2. **Test Upload:**
   - Sketch → Examples → Blink
   - Verify → Upload
   - Onboard LED should blink (confirms upload success)

#### 3.3: Install Required Libraries
Arduino libraries needed for sensors and WiFi:

1. **DHT Sensor Library (Adafruit):**
   - Tools → Manage Libraries
   - Search "DHT"
   - Install "DHT sensor library by Adafruit" (v1.4.4 or later)

2. **WiFi Library:**
   - Usually pre-installed, but verify:
   - Tools → Manage Libraries → Search "WiFi"
   - Should see "WiFi by Arduino"

3. **Time Library (for NTP timestamps):**
   - Tools → Manage Libraries → Search "time"
   - Install "Time by Paul Stoffregen" (optional, for accurate timestamps)

**Verification:**
- Sketch → Include Library
- Verify DHT, WiFi options appear in menu

### 4. **Firmware Programming & Configuration**

#### 4.1: Obtain Firmware Sketch
- Get `SmartFarm_Node.ino` from Arduino IDE Developer
- Place in `~/Arduino/SmartFarm_Node/` folder

#### 4.2: Configure for Each Board
Edit the firmware to set unique Sensor ID and Location per board:

**Option A: Edit sketch directly (simplest)**
```cpp
// In SmartFarm_Node.ino, modify constants before compile:
char SENSOR_ID[10] = "001";        // Change to "002", "003", etc.
char LOCATION_NAME[20] = "North_Field";  // Change per location

// Compile & upload to this board
```

**Option B: Use EEPROM Configuration (more flexible)**
```
After uploading firmware with default ID:
1. Open Serial Monitor (Tools → Serial Monitor, 115200 baud)
2. Type: CONFIGURE 001 North_Field
3. Arduino responds: "Configuration saved!"
4. Reboot Arduino; ID persists
```

**Workflow for 5 Nodes:**
```
Node 1:
- Edit sketch: SENSOR_ID="001", LOCATION_NAME="North_Field"
- Compile & Upload
- Verify Serial Monitor: "Sensor ID: 001, Location: North_Field"

Node 2:
- Edit sketch: SENSOR_ID="002", LOCATION_NAME="Tomato_Greenhouse"
- Compile & Upload
- Verify Serial Monitor: "Sensor ID: 002, Location: Tomato_Greenhouse"

[Repeat for Nodes 3, 4, 5]
```

#### 4.3: Configure WiFi Settings
In firmware, customize WiFi credentials:
```cpp
const char* ssid = "FarmNetwork";    // Your WiFi network name
const char* password = "FarmPass123"; // Your WiFi password
const char* serverIP = "192.168.1.100";  // Backend server IP
const int serverPort = 3000;          // Backend server port
```

**Before uploading, verify:**
- WiFi router name (SSID) is correct
- WiFi password is correct
- Backend server IP matches Backend Dev 1's setup (ask Backend Dev 1)

### 5. **Component Testing (Isolated)**
Test each sensor in isolation before full assembly:

#### 5.1: DHT11 Sensor Test
1. Load Arduino IDE → Examples → DHT sensor library → DHTtester
2. Upload test sketch to Arduino
3. Open Serial Monitor (115200 baud)
4. Verify output:
   ```
   DHT initialized
   Sensor: DHT11
   Status: OK
   Humidity: 65.00%
   Temperature: 24.50°C
   Heat Index: 24.50°C
   ```
5. Breathe warm air on sensor; temperature should increase
6. Humidity readings should be 30-90% (not 0 or 100)
7. **Accept if:** Read succeeds 10 times in a row without NaN errors

#### 5.2: LDR Sensor Test
1. Create test sketch:
   ```cpp
   void setup() {
     Serial.begin(9600);
   }
   void loop() {
     int ldr = analogRead(A0);
     Serial.print("LDR reading: ");
     Serial.println(ldr);
     delay(1000);
   }
   ```
2. Upload and open Serial Monitor
3. Verify readings: 0-1023 range
4. Cover LDR with finger → reading drops
5. Point at bright light → reading increases
6. **Accept if:** Readings change smoothly 200-800+ (not stuck at 0 or 1023)

#### 5.3: WiFi Shield Test
1. Load Arduino IDE → Examples → WiFi → WiFiAccessPoint
2. Modify SSID/password to match farm WiFi
3. Upload to Arduino
4. Open Serial Monitor
5. Should show:
   ```
   Wi-Fi shield present
   Attempting to connect to SSID: FarmNetwork
   SSID: FarmNetwork
   Signal strength (RSSI):
   IP Address: 192.168.1.150
   Gateway IP: 192.168.1.1
   ```
6. **Accept if:** Connects within 10 seconds, shows valid IP address

#### 5.4: Backend Connectivity Test
1. Arduino IDE Developer provides test sketch that POSTs dummy JSON to Backend
2. Load and upload test sketch
3. Backend server running on `192.168.1.100:3000`
4. Open Serial Monitor
5. Should show: `HTTP response: 200 OK`
6. Backend Dev 1 confirms: data received in database
7. **Accept if:** HTTP status 200, no timeouts, response under 2 seconds

### 6. **Full System Integration Test**

After individual component tests pass, test entire sensor node end-to-end:

#### 6.1: Pre-Deployment Checklist

```
Test Node ID: _____   Location: _______________

□ Hardware Assembly
  □ DHT11 wired correctly (data pin 2, pull-up resistor confirmed)
  □ LDR wired in voltage divider to A0 (10kΩ confirmed)
  □ WiFi Shield stacked on Arduino
  □ Power supply connected, Arduino boots

□ Firmware Programming
  □ SmartFarm_Node.ino uploaded successfully (no compile errors)
  □ Unique Sensor ID set in firmware (e.g., "002")
  □ Unique Location Name set (e.g., "Tomato_Greenhouse")
  □ WiFi SSID and password configured
  □ Backend server IP set correctly

□ Component Testing
  □ DHT11 readings stable (temp 15-35°C, humidity 30-90%)
  □ LDR readings vary with light (not stuck at 0 or 1023)
  □ WiFi Shield connects to FarmNetwork
  □ HTTP POST to Backend succeeds (200 response)

□ Daytime Filtering Test
  □ Daylight: Serial Monitor shows "Transmitting data..." every 5 sec
  □ Cover with cloth (simulating night): Serial Monitor shows "Skipping (nighttime)"
  □ Uncover: Transmissions resume
  □ Backend Dashboard shows data gaps during "night"

□ Power & Stability
  □ Arduino runs continuously for 30 minutes without reset
  □ WiFi reconnects automatically after brief disconnect
  □ No data corruption (Backend receives valid JSON)

□ Final Verification
  □ Backend Dev 1 confirms all 5 sensor nodes visible in Dashboard
  □ Frontend Developer confirms Dashboard displays correct Location Names
  □ No "ghost" nighttime data in Backend (edge computing working)
```

#### 6.2: Test Log Template (Per Node)

```
=== SENSOR NODE TEST LOG ===
Test Date: 2026-03-31
Tester: [Your Name]
Node ID: 003
Location: East_Garage

HARDWARE ASSEMBLY: ✓ PASS
  DHT11: Connected to pin 2, pull-up 10kΩ to 5V
  LDR: Voltage divider, 10kΩ resistor to A0
  WiFi Shield: Stacked, aligned correctly
  Visual inspection: No solder bridges, components secure

COMPONENT TESTS: ✓ PASS
  DHT11:
    - 10 consecutive reads successful
    - Temperature range 20-25°C (room temp)
    - Humidity range 50-60% (expected)
  
  LDR:
    - Daylight (window): 762 ADC
    - Indoors (ceiling light): 320 ADC
    - Dark (covered): 45 ADC
    - Threshold 300: DAYLIGHT detected correctly
  
  WiFi:
    - Connected to FarmNetwork
    - IP: 192.168.1.105
    - Signal strength: -55 dBm (good)
  
  Backend Connection:
    - POST to 192.168.1.100:3000 returns 200
    - Payload received and stored (Backend Dev 1 confirmed)

EDGE COMPUTING TEST: ✓ PASS
  Daylight (simulated): Transmits every 5 seconds ✓
  Night (covered): Skips transmission ✓
  Transition (gradual cover): Threshold at LDR ~320 ✓
  Backend gap: No data from 9:00 PM - 6:00 AM ✓

STABILITY TEST: ✓ PASS
  Runtime: 30 minutes continuous
  Reboots: 0
  Data loss: 0 packets
  Memory usage: Stable

OVERALL: ✓ PASS — READY FOR DEPLOYMENT

Signed: [Assembler Name]
```

### 7. **Deployment to Farm Locations**

Once all tests pass:

#### 7.1: Prepare Physical Enclosures
1. Mount Arduino + breadboard in waterproof IP65 enclosure
2. Drill hole for LDR to face outward (detect sunlight)
3. Seal all cable entry points with silicone or cable glands
4. Label enclosure with Sensor ID ("001", "002", etc.)

#### 7.2: Install at Field Locations
1. **North_Field:** Mount on pole, 1.5m height, facing south (max sun exposure)
2. **Tomato_Greenhouse:** Inside, near crop canopy (~1m height)
3. **East_Garage:** On wall, shaded location (test temperature stability)
4. **South_Storage:** Open area, unobstructed microclimate
5. **West_Shed:** Under eaves, protected from rain but with sunlight access

#### 7.3: Network Configuration
1. Position each node within WiFi range of BackendServer
2. If WiFi weak at certain locations, install WiFi repeater
3. Test WiFi signal strength with Multimeter WiFi scanner app
4. Verify Backend Dashboard shows all 5 nodes online

#### 7.4: Ongoing Monitoring
- Check dashboard daily: all sensors online?
- Check data gaps: expected nighttime (6 PM - 6 AM) vs anomalies
- Monitor temperature/humidity trends: alert if values unrealistic
- Monthly: physically inspect sensors for damage, dust, corrosion

### 8. **Troubleshooting Guide**

| Issue | Symptom | Diagnosis | Solution |
|-------|---------|-----------|----------|
| **DHT11 NaN** | Serial: "Temperature: NaN" | Loose connection or bad pull-up resistor | Check pin 2 connection, verify 10kΩ resistor 2→5V |
| **LDR stuck high** | ADC always 1023 | LDR disconnected or reversed | Verify LDR legs in voltage divider, check for shorts |
| **WiFi won't connect** | Serial: "Failed to connect to WiFi" | Wrong SSID/password or router not on | Verify WiFi SSID and password in firmware, check router online |
| **Backend 404 error** | HTTP POST returns 404 | Wrong server IP or port | Ask Backend Dev 1 for correct IP:port, verify in firmware |
| **Data not in Backend** | Dashboard empty or missing node | Sensor ID doesn't match registered ID | Check Arduino EEPROM ID vs Backend sensors table |
| **Freezing readings** | DHT11 shows same temp for hours | Sensor malfunction or frozen I2C bus | Reboot Arduino, check for short circuits on data line |
| **Night transmissions visible** | Backend shows 3:00 AM data | Edge computing not working; is_daytime always true | Check LDR threshold; LDR might be seeing indoor light at night |
| **Low signal strength** | WiFi RSSI < -70 dBm | Too far from router, obstruction | Move router closer or install WiFi repeater closer to farm |

### 9. **Documentation Creation**

Deliver the following to your team:

#### 9.1: Assembly Manual (`ASSEMBLY_GUIDE.md`)
- Step-by-step photos of breadboard preparation
- List of tools needed (multimeter, soldering iron [optional], etc.)
- Wiring diagrams (ASCII or images)
- Timing: ~1-2 hours per node for experienced technician

#### 9.2: Configuration Guide (`NODE_CONFIGURATION.md`)
- How to upload firmware with unique ID per node
- WiFi credential setup
- EEPROM configuration (if used)
- Testing each component after upload

#### 9.3: Test Log Template (`TEST_LOG_TEMPLATE.md`)
- Standardized checklist for pre-deployment testing
- Where to sign off ("Ready for deployment")
- Troubleshooting reference

#### 9.4: Deployment Runbook (`DEPLOYMENT_GUIDE.md`)
- Field locations, optimal mounting height, orientation
- WiFi coverage map
- Safety considerations (electrical, weather protection)
- Monthly maintenance checklist

### 10. **Integration with Team**

#### From Arduino IDE Developer:
- Firmware .ino file
- Wiring diagram
- Configuration guide (how to set Sensor ID)
- Component test sketches

#### From Backend Developers:
- Backend server IP and port
- Expected JSON payload format
- Verification that sensors appear in Dashboard

#### To the Team:
- Per-node test logs (all 5 sensors passing)
- Physical node delivery (with enclosures ready)
- Deployment photos/documentation
- Any issues encountered and how they were resolved

---

## Deliverables Checklist

- [ ] **Hardware Bill of Materials (BOM)** (`BOM.xlsx`)
  - List of all components with part numbers, costs, suppliers
  - Total cost analysis for 5 nodes

- [ ] **Assembly Manual** (`ASSEMBLY_GUIDE.md`)
  - Step-by-step wiring instructions with photos
  - Circuit diagrams (DHT11 voltage divider, LDR setup)
  - Time estimate per node
  - Tools required (soldering iron, multimeter, etc.)

- [ ] **Wiring Diagram** (`WIRING_DIAGRAM.png` or ASCII)
  - Breadboard layout with all components labeled
  - Pin assignments clearly marked
  - Voltage/current annotations

- [ ] **Configuration Guide** (`NODE_CONFIG_GUIDE.md`)
  - How to upload firmware to each Arduino
  - How to set unique Sensor ID per node (EEPROM or hardcoded)
  - How to configure WiFi SSID/password
  - How to set Backend server IP:port

- [ ] **Test Sketches** (`Test_DHT11.ino`, `Test_LDR.ino`, `Test_WiFi.ino`, `Test_Backend.ino`)
  - Isolated component testing sketches (one per sensor)
  - Backend connectivity test sketch
  - Serial output examples (expected results)

- [ ] **Pre-Deployment Checklist** (`PREFLIGHT_CHECKLIST.md`)
  - Hardware assembly checklist
  - Component testing checklist
  - Full system integration checklist
  - Signature line for "Ready for Deployment"

- [ ] **Test Log Template** (`TEST_LOG_TEMPLATE.md`)
  - Per-node test results form
  - Daytime filtering verification
  - Stability test results
  - Sign-off for each node

- [ ] **Troubleshooting Guide** (`TROUBLESHOOTING.md`)
  - Common issues (DHT11 NaN, LDR stuck, WiFi won't connect)
  - Diagnosis steps
  - Solutions
  - When to escalate to Arduino IDE Developer

- [ ] **Deployment Guide** (`DEPLOYMENT_GUIDE.md`)
  - Field location map (5 locations with coordinates)
  - Mounting setup per location (height, orientation)
  - WiFi signal strength requirements
  - Safety precautions
  - Monthly maintenance schedule

- [ ] **5 Tested Sensor Nodes** (Physical deliverable)
  - All 5 nodes assembled, programmed, tested
  - Waterproof enclosures prepared
  - Labeled with Sensor IDs
  - Test logs signed off

- [ ] **Integration Verification Document** (`INTEGRATION_STATUS.md`)
  - Confirmation: All nodes visible in Backend
  - Confirmation: All locations visible on Frontend Dashboard
  - Confirmation: Daytime filtering working (nighttime gaps visible)
  - Issues encountered and resolutions

---

## Tech Stack

| Component | Specification |
|-----------|---------------|
| **Microcontroller** | Arduino Mega 2560 (ATmega2560) |
| **WiFi Module** | Arduino WiFi Shield Rev2 (IEEE 802.11 b/g/n) |
| **Temperature/Humidity** | DHT11 (±2°C accuracy) |
| **Light Sensor** | LDR GL5537 (CdS photoresistor) |
| **Operating Voltage** | 5V DC |
| **Power Supply** | USB 5V 1A minimum per node |
| **IDE** | Arduino IDE 2.0+ |
| **Required Libraries** | Adafruit DHT, WiFi, optional Time |

---

## Timeline & Phases

### Phase 1: Preparation (1-2 days)
- Procure components (research suppliers, order)
- Prepare workspace (tools, breadboards, multimeter)
- Download firmware from Arduino IDE Developer
- Review schematic and wiring guide

### Phase 2: Assembly (3-5 days, 1-2 hours per node)
- Build 5 breadboard circuits
- Test each component in isolation
- Program firmware with unique IDs

### Phase 3: Testing (1-2 days)
- Run full integration tests per node
- Verify all tests pass before deployment
- Create test logs

### Phase 4: Deployment (1 day)
- Mount enclosures at field locations
- Verify WiFi connectivity
- Confirm data appears in Backend and Frontend

### Phase 5: Monitoring (Ongoing)
- Daily dashboard checks
- Monthly physical inspections
- Document any issues or anomalies

---

## Acceptance Criteria (Definition of Done)

You're done when:
1. ✅ All 5 sensor nodes successfully assembled
2. ✅ Each node programmed with unique Sensor ID (001-005)
3. ✅ Each node assigned to correct Location Name (North_Field, etc.)
4. ✅ All component tests passing (DHT11, LDR, WiFi, Backend)
5. ✅ Daytime filtering verified working (no nighttime data)
6. ✅ All 5 nodes transmit data successfully to Backend
7. ✅ Backend Dashboard displays all 5 locations correctly
8. ✅ Frontend Developer confirms chart data updates in real-time
9. ✅ 30+ minute stability test passes (no reboots, no data loss)
10. ✅ Pre-deployment test logs signed off for all 5 nodes
11. ✅ Nodes deployed to farm field locations
12. ✅ WiFi connectivity verified at all 5 locations
13. ✅ Ongoing monitoring checklist handed off to farm operator

---

## Success Signals

- Arduino sketch uploads successfully (no compile errors)
- All 5 nodes boot and display "Sensor ID: XXX, Location: YYY"
- DHT11 readings stable within ±1°C over 10 reads
- LDR threshold correctly detects daylight transitions
- WiFi connects within 10 seconds of boot
- Backend receives data within 2 seconds of transmission
- Backend Dashboard shows all 5 sensor nodes online
- Frontend Dashboard displays temperature/humidity charts for all locations
- No data transmitted during nighttime (3 PM - 6 AM daytime filter working)
- Farm operator confirms: "System working as expected, minimal intervention needed"

---

## Quick Reference: Per-Node Workflow

```
For each of 5 nodes:

1. ASSEMBLE (45 min)
   ├─ Place components on breadboard
   ├─ Wire DHT11 (pin 2, 5V, GND, pull-up)
   ├─ Wire LDR (voltage divider to A0)
   ├─ Stack WiFi Shield
   └─ Apply 5V power, verify boot

2. PROGRAM (15 min)
   ├─ Edit SmartFarm_Node.ino: set SENSOR_ID, LOCATION_NAME
   ├─ Verify Arduino IDE board=Mega, port=COMx
   ├─ Upload and monitor Serial output
   └─ Verify correct ID and location print

3. TEST (20 min)
   ├─ Run DHT11 test sketch → verify readings
   ├─ Run LDR test sketch → verify light detection
   ├─ Run WiFi test sketch → verify connection
   ├─ Run Backend test sketch → verify HTTP 200 response
   └─ Check Backend Dashboard: data appears

4. DOCUMENT (10 min)
   ├─ Fill test log with results
   ├─ Note any issues or observations
   ├─ Sign off "PASS" or "RETRY"
   └─ Archive photos of circuit

5. PREPARE FOR DEPLOYMENT (5 min)
   ├─ Mount in waterproof enclosure
   ├─ Label with Sensor ID
   ├─ Pack for transport to field
   └─ Prepare for mounting at location

Total per node: ~1.5-2 hours for first node, 45 min-1 hour for subsequent nodes
```

